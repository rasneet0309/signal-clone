"""
Pydantic schemas define the JSON shape of data going in and out of our API.

Naming convention we'll use:
- `...Create` = shape of data the frontend SENDS to create something
- `...Out`    = shape of data we SEND BACK to the frontend
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# ---------- USER ----------

class UserCreate(BaseModel):
    username: str
    phone_number: Optional[str] = None
    display_name: str
    password: str
    avatar_url: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str
    otp: Optional[str] = None  # mocked OTP, we'll accept a fixed value like "0000"


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    last_seen: datetime

    class Config:
        from_attributes = True  # lets Pydantic read directly from SQLAlchemy objects


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- CONTACTS ----------

class ContactAdd(BaseModel):
    username: str  # add a contact by their username


# ---------- CONVERSATIONS ----------

class ConversationCreate(BaseModel):
    is_group: bool
    name: Optional[str] = None       # required if is_group=True
    member_usernames: List[str]      # usernames of people to add (not including yourself)


class ConversationMemberOut(BaseModel):
    user: UserOut
    is_admin: bool

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    is_group: bool
    name: Optional[str]
    created_at: datetime
    members: List[ConversationMemberOut] = []

    class Config:
        from_attributes = True


# ---------- MESSAGES ----------

class MessageCreate(BaseModel):
    conversation_id: int
    content: str


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
    
class MessageStatusOut(BaseModel):
    user: UserOut
    status: str
    updated_at: datetime

    class Config:
        from_attributes = True
