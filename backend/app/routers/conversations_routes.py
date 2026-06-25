"""
Conversation routes:
POST /conversations             -> create a 1:1 or group conversation
GET  /conversations             -> list MY conversations, sorted by most recent activity
GET  /conversations/{id}        -> get one conversation with members
POST /conversations/{id}/members        -> add a member (group admin only)
DELETE /conversations/{id}/members/{user_id} -> remove a member (group admin only)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models, schemas, auth
from ..database import get_db
from ..connection_manager import manager

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _get_membership_or_404(db, conversation_id, user_id):
    membership = (
        db.query(models.ConversationMember)
        .filter(
            models.ConversationMember.conversation_id == conversation_id,
            models.ConversationMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return membership


def _get_conversation_member_ids(db, conversation_id):
    rows = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conversation_id
    ).all()
    return [r.user_id for r in rows]


@router.post("", response_model=schemas.ConversationOut)
def create_conversation(
    payload: schemas.ConversationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if payload.is_group and not payload.name:
        raise HTTPException(status_code=400, detail="Group name is required")

    # Look up the member users by username
    members = db.query(models.User).filter(
        models.User.username.in_(payload.member_usernames)
    ).all()
    if len(members) != len(payload.member_usernames):
        raise HTTPException(status_code=404, detail="One or more usernames not found")

    # For 1:1 chats, check if a conversation between these 2 people already exists
    # (avoids creating duplicate DMs every time you click a contact)
    if not payload.is_group and len(members) == 1:
        other = members[0]
        existing = (
            db.query(models.Conversation)
            .join(models.ConversationMember)
            .filter(
                models.Conversation.is_group == False,
                models.ConversationMember.user_id.in_([current_user.id, other.id]),
            )
            .group_by(models.Conversation.id)
            .having(func.count(models.ConversationMember.id) == 2)
            .all()
        )
        for convo in existing:
            member_ids = {m.user_id for m in convo.members}
            if member_ids == {current_user.id, other.id}:
                return convo

    conversation = models.Conversation(is_group=payload.is_group, name=payload.name)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    # Add the creator as a member (admin if group)
    db.add(models.ConversationMember(
        conversation_id=conversation.id,
        user_id=current_user.id,
        is_admin=payload.is_group,
    ))
    # Add the other requested members
    for member in members:
        db.add(models.ConversationMember(
            conversation_id=conversation.id,
            user_id=member.id,
            is_admin=False,
        ))
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("", response_model=list[schemas.ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    conversations = (
        db.query(models.Conversation)
        .join(models.ConversationMember)
        .filter(models.ConversationMember.user_id == current_user.id)
        .all()
    )

    def last_activity(convo):
        last_msg = (
            db.query(models.Message)
            .filter(models.Message.conversation_id == convo.id)
            .order_by(models.Message.created_at.desc())
            .first()
        )
        return last_msg.created_at if last_msg else convo.created_at

    conversations.sort(key=last_activity, reverse=True)
    return conversations


@router.get("/{conversation_id}", response_model=schemas.ConversationOut)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    _get_membership_or_404(db, conversation_id, current_user.id)
    return db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()


@router.post("/{conversation_id}/members", response_model=schemas.ConversationOut)
async def add_member(
    conversation_id: int,
    payload: schemas.ContactAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    membership = _get_membership_or_404(db, conversation_id, current_user.id)
    if not membership.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can add members")

    user_to_add = db.query(models.User).filter(
        models.User.username == payload.username
    ).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User not found")

    already_member = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conversation_id,
        models.ConversationMember.user_id == user_to_add.id,
    ).first()
    if already_member:
        raise HTTPException(status_code=400, detail="User already in conversation")

    db.add(models.ConversationMember(
        conversation_id=conversation_id, user_id=user_to_add.id, is_admin=False
    ))
    db.commit()

    # Post a chat message announcing the change, so everyone sees it live
    # (same pattern Signal/WhatsApp use for "X added Y" group notifications)
    note = models.Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=f"{current_user.display_name} added {user_to_add.display_name} to the group",
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    updated = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()

    # member_ids now includes the newly added person, so they see the group
    # appear immediately too, without needing to refresh
    member_ids = _get_conversation_member_ids(db, conversation_id)
    await manager.broadcast_to_users(member_ids, {
        "type": "new_message",
        "message": {
            "id": note.id,
            "conversation_id": note.conversation_id,
            "sender_id": note.sender_id,
            "content": note.content,
            "created_at": note.created_at.isoformat(),
        },
    })
    await manager.broadcast_to_users(member_ids, {
        "type": "conversation_updated",
        "conversation_id": conversation_id,
    })

    return updated


@router.delete("/{conversation_id}/members/{user_id}", response_model=schemas.ConversationOut)
async def remove_member(
    conversation_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    membership = _get_membership_or_404(db, conversation_id, current_user.id)
    if not membership.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can remove members")

    target = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conversation_id,
        models.ConversationMember.user_id == user_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    removed_user = db.query(models.User).filter(models.User.id == user_id).first()

    # Grab the member list BEFORE deleting, so we can still notify the
    # person who just got removed (they won't be in the query after delete)
    member_ids_before = _get_conversation_member_ids(db, conversation_id)

    db.delete(target)
    db.commit()

    note = models.Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=f"{current_user.display_name} removed {removed_user.display_name} from the group",
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    updated = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()

    # Remaining members see the new "removed" message in the chat.
    # The removed person does NOT get the chat message (they're no longer
    # in the conversation), but DOES get the conversation_updated ping so
    # their sidebar can drop this group without needing a refresh.
    remaining_member_ids = _get_conversation_member_ids(db, conversation_id)
    await manager.broadcast_to_users(remaining_member_ids, {
        "type": "new_message",
        "message": {
            "id": note.id,
            "conversation_id": note.conversation_id,
            "sender_id": note.sender_id,
            "content": note.content,
            "created_at": note.created_at.isoformat(),
        },
    })
    await manager.broadcast_to_users(member_ids_before, {
        "type": "conversation_updated",
        "conversation_id": conversation_id,
    })

    return updated