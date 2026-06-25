"""
Auth routes:
POST /auth/register  -> create a new user
POST /auth/login      -> check username+password+otp, return a JWT token
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check username isn't already taken
    existing = db.query(models.User).filter(
        models.User.username == payload.username
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    user = models.User(
        username=payload.username,
        phone_number=payload.phone_number,
        display_name=payload.display_name,
        avatar_url=payload.avatar_url,
        password_hash=auth.hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token(user.id)
    return schemas.Token(access_token=token, user=user)


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == payload.username
    ).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Mocked OTP check - in a real app this would be a code sent via SMS
    if payload.otp is not None and payload.otp != auth.MOCKED_OTP:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    user.last_seen = datetime.utcnow()
    db.commit()

    token = auth.create_access_token(user.id)
    return schemas.Token(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
