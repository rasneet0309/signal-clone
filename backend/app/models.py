"""
This file defines our 5 tables as Python classes.
Each class = one table. Each Column(...) line = one column in that table.

`relationship(...)` lines don't create columns — they just let us write
Python code like `conversation.members` to get related rows easily,
instead of writing manual SQL joins every time.
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, unique=True, nullable=True)
    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    is_group = Column(Boolean, default=False)
    name = Column(String, nullable=True)  # only used when is_group=True
    created_at = Column(DateTime, default=datetime.utcnow)

    # lets us write `conversation.members` to get all ConversationMember rows
    members = relationship("ConversationMember", back_populates="conversation")
    messages = relationship("Message", back_populates="conversation")


class ConversationMember(Base):
    """
    This is the 'join table' that connects users <-> conversations.
    A conversation can have many members, a user can be in many conversations.
    """
    __tablename__ = "conversation_members"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_admin = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
    statuses = relationship("MessageStatus", back_populates="message")


class MessageStatus(Base):
    """
    Tracks delivery/read status PER RECIPIENT.
    Why per recipient? In a group chat of 5 people, each person reads
    the message at a different time, so we need one row per (message, user) pair.
    status is one of: "sent", "delivered", "read"
    """
    __tablename__ = "message_status"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="sent")
    updated_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("Message", back_populates="statuses")
    user = relationship("User")
