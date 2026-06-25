"""
Message routes (REST):
GET  /messages/{conversation_id}   -> load message history when opening a chat
POST /messages/{conversation_id}/read  -> mark all messages in this chat as read

Sending NEW messages happens over the WebSocket (see websocket.py),
not here - REST is just for loading existing history.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/{conversation_id}", response_model=list[schemas.MessageOut])
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    membership = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conversation_id,
        models.ConversationMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.asc())
        .all()
    )

    # Build the response manually so we can attach a lightweight
    # "reply_to" preview (sender name + snippet) without extra round trips.
    result = []
    for msg in messages:
        reply_preview = None
        if msg.reply_to_id and msg.reply_to:
            reply_preview = schemas.ReplyPreview(
                id=msg.reply_to.id,
                sender_id=msg.reply_to.sender_id,
                sender_name=msg.reply_to.sender.display_name,
                content=msg.reply_to.content,
            )
        result.append(schemas.MessageOut(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            content=msg.content,
            created_at=msg.created_at,
            reply_to=reply_preview,
        ))
    return result


@router.post("/{conversation_id}/read")
def mark_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Find all messages in this conversation NOT sent by me, and mark
    # my status row for each as "read" (creating it if it doesn't exist yet)
    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id,
        models.Message.sender_id != current_user.id,
    ).all()

    for msg in messages:
        status_row = db.query(models.MessageStatus).filter(
            models.MessageStatus.message_id == msg.id,
            models.MessageStatus.user_id == current_user.id,
        ).first()
        if status_row:
            status_row.status = "read"
        else:
            db.add(models.MessageStatus(
                message_id=msg.id, user_id=current_user.id, status="read"
            ))
    db.commit()
    return {"ok": True, "marked": len(messages)}


@router.get("/info/{message_id}", response_model=list[schemas.MessageStatusOut])
def get_message_info(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Returns the per-recipient delivery/read status for one message, with
    timestamps - this is what powers the "message info" panel (tap the
    checkmarks on your own message to see who has read it and when,
    especially useful in group chats with multiple recipients).
    Only the sender of the message is allowed to view this.
    """
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the sender can view message info")

    return db.query(models.MessageStatus).filter(
        models.MessageStatus.message_id == message_id
    ).all()