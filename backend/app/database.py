"""
This file sets up the connection to our database.
We're using SQLite, which is just a single file on disk (signal.db) —
no separate database server needed. Perfect for a project like this.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./signal.db"

# `engine` is the actual connection to the database file
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# `SessionLocal` is a factory that gives us a fresh "conversation"
# with the database every time we need to read/write something
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# `Base` is the parent class that all our table models will inherit from
Base = declarative_base()


def get_db():
    """
    This function is used by FastAPI to give each API request
    its own database session, and automatically close it when done.
    Think of it like: "open the database, do your work, then close it."
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
