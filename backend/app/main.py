"""
This is the entrypoint - the file you run to start the backend server.
It creates the FastAPI app, creates database tables if they don't exist,
and wires up all our routers (auth, contacts, conversations, messages, websocket).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from . import models  # noqa - needed so SQLAlchemy knows about our tables
from .routers import auth_routes, contacts_routes, conversations_routes, messages_routes
from . import websocket as websocket_module
from .seed import run_seed

# This line actually creates signal.db and all 5 tables, if they don't exist yet
Base.metadata.create_all(bind=engine)

# Auto-seed demo data if the database is completely empty. This matters on
# free-tier hosting (e.g. Render's free plan) where the disk is wiped on
# every restart - this way the app always has demo data ready to go,
# without needing shell access to manually re-run the seed script.
_db = SessionLocal()
if _db.query(models.User).count() == 0:
    print("Database is empty - running initial seed...")
    run_seed()
_db.close()

app = FastAPI(title="Signal Clone API")

# CORS lets our Next.js frontend (running on a different port/domain)
# talk to this backend. In production, replace "*" with your real frontend URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(contacts_routes.router)
app.include_router(conversations_routes.router)
app.include_router(messages_routes.router)
app.include_router(websocket_module.router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Signal Clone API is running"}
