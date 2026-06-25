"""
Contacts routes:
GET  /contacts          -> list all users you can start a chat with
POST /contacts/add      -> "add" a contact by username (in this simplified
                            model, we treat "all registered users" as visible,
                            but this endpoint validates the user exists and
                            could be extended to a real contacts table later)
GET  /contacts/search?q=  -> search users by username/display name
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[schemas.UserOut])
def list_contacts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Everyone except yourself - simple model for this assignment
    return db.query(models.User).filter(models.User.id != current_user.id).all()


@router.get("/search", response_model=list[schemas.UserOut])
def search_contacts(
    q: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.User)
        .filter(models.User.id != current_user.id)
        .filter(
            (models.User.username.ilike(f"%{q}%"))
            | (models.User.display_name.ilike(f"%{q}%"))
        )
        .all()
    )


@router.post("/add", response_model=schemas.UserOut)
def add_contact(
    payload: schemas.ContactAdd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    user = db.query(models.User).filter(
        models.User.username == payload.username
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user with that username")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    return user
