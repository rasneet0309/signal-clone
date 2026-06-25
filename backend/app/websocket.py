"""
The single WebSocket endpoint for the whole app: /ws?token=...

Why one endpoint instead of one-per-conversation?
Simpler: each user opens ONE socket when the app loads, and we route
events to the right conversation based on a `conversation_id` field
inside each JSON message - no need to reconnect when switching chats.

Events the FRONTEND sends to us (over the socket):
  {"type": "message", "conversation_id": 3, "content": "hey"}
  {"type": "typing", "conversation_id": 3, "is_typing": true}
  {"type": "read", "conversation_id": 3}

Events WE send back to the frontend (broadcast to relevant users):
  {"type": "new_message", "message": {...}}
  {"type": "typing", "conversation_id": 3, "user_id": 7, "is_typing": true}
  {"type": "message_status", "message_id": 12, "status": "sent"|"delivered"|"read"}
  {"type": "presence", "user_id": 7, "online": true|false}

IMPORTANT note on "message_status" sent to the SENDER:
In a group chat, a message has MULTIPLE recipients, each with their own
status. The status we report back to the SENDER is an AGGREGATE across
ALL recipients - using the "worst case" (least-progressed) status, which
is how Signal/WhatsApp actually do it:
  - "sent"      -> at least one recipient hasn't received it yet
  - "delivered" -> everyone has received it, but not everyone has read it
  - "read"      -> EVERYONE has read it (only then does the tick turn blue)
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from datetime import datetime

from . import models, auth
from .database import SessionLocal
from .connection_manager import manager

router = APIRouter()


def _get_conversation_member_ids(db: Session, conversation_id: int) -> list[int]:
    rows = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conversation_id
    ).all()
    return [r.user_id for r in rows]


def _compute_aggregate_status(db: Session, message_id: int, recipient_ids: list[int]) -> str:
    """
    Looks at every recipient's individual status row for this message and
    returns the worst-case (least progressed) status across all of them.
    A recipient with no status row yet is treated as "sent" (not even
    delivered), since their row is only created once they're a known member.
    """
    if not recipient_ids:
        return "sent"

    rows = db.query(models.MessageStatus).filter(
        models.MessageStatus.message_id == message_id,
        models.MessageStatus.user_id.in_(recipient_ids),
    ).all()
    status_by_user = {r.user_id: r.status for r in rows}

    all_statuses = [status_by_user.get(uid, "sent") for uid in recipient_ids]

    if all(s == "read" for s in all_statuses):
        return "read"
    if all(s in ("delivered", "read") for s in all_statuses):
        return "delivered"
    return "sent"


async def _notify_sender_of_aggregate_status(db: Session, message: models.Message):
    member_ids = _get_conversation_member_ids(db, message.conversation_id)
    recipient_ids = [m for m in member_ids if m != message.sender_id]
    aggregate = _compute_aggregate_status(db, message.id, recipient_ids)
    await manager.send_to_user(message.sender_id, {
        "type": "message_status",
        "message_id": message.id,
        "status": aggregate,
    })


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    # We need our own DB session here since this isn't a normal
    # Depends()-based route - WebSockets work a bit differently.
    db = SessionLocal()
    user = auth.get_current_user_ws(token, db)
    if user is None:
        await websocket.close(code=4001)
        db.close()
        return

    await manager.connect(user.id, websocket)

    # Catch-up: any messages that were waiting for this user (status="sent"
    # because they were offline) are now deliverable, since they just connected.
    # Flip those rows to "delivered" and recompute+notify the aggregate status
    # for each affected message (not just blindly say "delivered" - if this
    # is a group and someone else still hasn't received it, it should stay "sent").
    pending = db.query(models.MessageStatus).filter(
        models.MessageStatus.user_id == user.id,
        models.MessageStatus.status == "sent",
    ).all()
    affected_message_ids = {row.message_id for row in pending}
    for status_row in pending:
        status_row.status = "delivered"
    if pending:
        db.commit()

    for message_id in affected_message_ids:
        msg = db.query(models.Message).filter(models.Message.id == message_id).first()
        if msg:
            await _notify_sender_of_aggregate_status(db, msg)

    # Tell everyone who shares a conversation with this user that they're online
    user.last_seen = datetime.utcnow()
    db.commit()

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "message":
                await _handle_new_message(db, user, data)
            elif event_type == "typing":
                await _handle_typing(db, user, data)
            elif event_type == "read":
                await _handle_read(db, user, data)

    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
        user.last_seen = datetime.utcnow()
        db.commit()
        # Let other online users know this person went offline
        member_ids = set()
        for convo_member in db.query(models.ConversationMember).filter(
            models.ConversationMember.user_id == user.id
        ).all():
            member_ids.update(
                _get_conversation_member_ids(db, convo_member.conversation_id)
            )
        await manager.broadcast_to_users(
            list(member_ids), {"type": "presence", "user_id": user.id, "online": False}
        )
    finally:
        db.close()


async def _handle_new_message(db: Session, user: models.User, data: dict):
    conversation_id = data.get("conversation_id")
    content = data.get("content", "").strip()
    reply_to_id = data.get("reply_to_id")
    if not content:
        return

    member_ids = _get_conversation_member_ids(db, conversation_id)
    if user.id not in member_ids:
        return  # not authorized to post in this conversation

    # If a reply_to_id was given, make sure it's actually a message in THIS
    # conversation - otherwise silently ignore it rather than trusting the client.
    reply_to_msg = None
    if reply_to_id:
        candidate = db.query(models.Message).filter(models.Message.id == reply_to_id).first()
        if candidate and candidate.conversation_id == conversation_id:
            reply_to_msg = candidate

    msg = models.Message(
        conversation_id=conversation_id,
        sender_id=user.id,
        content=content,
        reply_to_id=reply_to_msg.id if reply_to_msg else None,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Create a status row for every OTHER member.
    # If they're online right now, mark "delivered" immediately, else "sent".
    for member_id in member_ids:
        if member_id == user.id:
            continue
        status = "delivered" if manager.is_online(member_id) else "sent"
        db.add(models.MessageStatus(
            message_id=msg.id, user_id=member_id, status=status
        ))
    db.commit()

    reply_to_payload = None
    if reply_to_msg:
        reply_to_payload = {
            "id": reply_to_msg.id,
            "sender_id": reply_to_msg.sender_id,
            "sender_name": reply_to_msg.sender.display_name,
            "content": reply_to_msg.content,
        }

    payload = {
        "type": "new_message",
        "message": {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
            "reply_to": reply_to_payload,
        },
    }
    # Send to everyone in the conversation, including the sender
    # (so all of the sender's own open tabs also see it)
    await manager.broadcast_to_users(member_ids, payload)

    # Tell the sender the REAL aggregate delivery status across all recipients
    await _notify_sender_of_aggregate_status(db, msg)


async def _handle_typing(db: Session, user: models.User, data: dict):
    conversation_id = data.get("conversation_id")
    is_typing = data.get("is_typing", False)
    member_ids = _get_conversation_member_ids(db, conversation_id)

    others = [m for m in member_ids if m != user.id]
    await manager.broadcast_to_users(others, {
        "type": "typing",
        "conversation_id": conversation_id,
        "user_id": user.id,
        "is_typing": is_typing,
    })


async def _handle_read(db: Session, user: models.User, data: dict):
    conversation_id = data.get("conversation_id")
    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id,
        models.Message.sender_id != user.id,
    ).all()

    for msg in messages:
        status_row = db.query(models.MessageStatus).filter(
            models.MessageStatus.message_id == msg.id,
            models.MessageStatus.user_id == user.id,
        ).first()
        if status_row:
            status_row.status = "read"
        else:
            db.add(models.MessageStatus(
                message_id=msg.id, user_id=user.id, status="read"
            ))
    db.commit()

    # For each message, recompute the TRUE aggregate across all recipients
    # (not just this one reader) and notify the sender with that aggregate.
    for msg in messages:
        await _notify_sender_of_aggregate_status(db, msg)