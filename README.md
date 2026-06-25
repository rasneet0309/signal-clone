# Signal Clone — Secure Messaging Platform

A functional clone of Signal Messenger built for the SDE Fullstack assignment.
Real-time one-on-one and group messaging, contacts, typing indicators,
delivery/read receipts, and a UI closely modeled on Signal's actual design.

> Real cryptographic end-to-end encryption is **mocked** per the assignment
> brief — this project focuses on replicating the messaging UX and
> real-time architecture, not implementing the Signal Protocol.

## Live Demo

- **App:** https://signal-clone-seven.vercel.app
- **API:** https://signal-clone-backend-8013.onrender.com
- **Repo:** https://github.com/rasneet0309/signal-clone

**Demo accounts** (password `password123`, OTP `0000` for all):
`alice`, `bob`, `carol`, `dave`

> **Note on first load:** the backend is hosted on Render's free tier, which
> spins the server down after ~15 minutes of inactivity. The **first**
> request after a period of idle time can take 20-50 seconds to respond
> while it spins back up - this is expected free-tier behavior, not a bug.
> Subsequent requests are fast.
>
> Because the free tier's disk is also wiped on restart, the backend
> **automatically re-seeds the demo accounts and sample conversations** on
> startup if the database is found empty (see `app/seed.py` + the startup
> check in `app/main.py`) - so demo data is always available even after a
> cold restart, without needing manual shell access.

---

## Bonus Features Implemented

- **Dark mode** — toggle via the moon/sun icon at the bottom of the sidebar,
  persists across reloads via localStorage, applied across the entire app
  (chat, modals, login/register screens).
- **Responsive design** — on mobile-width screens, the sidebar and chat pane
  are no longer shown side-by-side; selecting a conversation shows it
  full-screen with a back arrow, matching how Signal's own mobile app works.
- **Keyboard shortcuts** — `Esc` closes any open modal, or (on mobile) backs
  out of an open conversation to the conversation list.
- **Notifications/toasts** — a toast notification appears top-right when a
  message arrives in a conversation you're not currently viewing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | SQLite + SQLAlchemy ORM |
| Real-time | Native WebSockets (FastAPI's built-in support) |
| Auth | JWT (access tokens), bcrypt password hashing, mocked OTP |

---

## Architecture Overview

```
┌─────────────────┐         REST (HTTP)        ┌──────────────────┐
│                  │ ─────────────────────────> │                  │
│  Next.js         │   (auth, contacts,         │   FastAPI        │
│  Frontend        │    conversations, history) │   Backend        │
│                  │ <───────────────────────── │                  │
│                  │                             │                  │
│                  │      WebSocket (/ws)        │                  │
│                  │ <══════════════════════════>│                  │
└─────────────────┘   (messages, typing,        └─────────┬────────┘
                        read receipts, presence)            │
                                                              │ SQLAlchemy
                                                       ┌──────▼───────┐
                                                       │  SQLite DB    │
                                                       │  signal.db    │
                                                       └───────────────┘
```

**Why this split?** REST handles anything that's a one-time request/response
(logging in, loading the conversation list, loading message history when you
open a chat). The WebSocket handles anything that needs to feel *instant* and
can happen at any time — new messages arriving, someone typing, a read
receipt updating. One WebSocket connection is opened per logged-in user when
the app loads, and stays open for the whole session; events are routed to the
right conversation using a `conversation_id` field inside each message,
rather than opening a new connection per chat.

### Backend structure
```
backend/
├── app/
│   ├── main.py              # FastAPI app entrypoint, wires up all routers
│   ├── database.py          # SQLite connection + session setup
│   ├── models.py            # SQLAlchemy table definitions (5 tables)
│   ├── schemas.py           # Pydantic request/response shapes
│   ├── auth.py               # password hashing, JWT creation/verification
│   ├── connection_manager.py # tracks who's online, sends WS messages
│   ├── websocket.py          # the /ws endpoint - real-time message engine
│   ├── seed.py                # populates DB with demo users/chats/messages
│   └── routers/
│       ├── auth_routes.py        # /auth/register, /auth/login, /auth/me
│       ├── contacts_routes.py    # /contacts, /contacts/search
│       └── conversations_routes.py, messages_routes.py
└── requirements.txt
```

### Frontend structure
```
frontend/
├── app/
│   ├── login/page.tsx        # login screen
│   ├── register/page.tsx     # registration screen
│   └── chat/page.tsx         # main app: sidebar + chat pane, all state lives here
├── components/
│   ├── ConversationList.tsx  # left sidebar
│   ├── ChatWindow.tsx        # right pane: header, messages, input
│   ├── MessageBubble.tsx     # individual message + status ticks
│   ├── NewChatModal.tsx / NewGroupModal.tsx / GroupInfoModal.tsx
│   └── Avatar.tsx, Modal.tsx
├── hooks/useWebSocket.ts     # opens the WebSocket, exposes send/receive helpers
└── lib/api.ts, auth.ts, types.ts, helpers.ts
```

---

## Database Schema

5 tables, designed so that group chats and 1:1 chats share the exact same
underlying model (a "conversation" with N members) — there's no separate
table or code path for groups vs DMs except a boolean flag.

```
users
├── id (PK)
├── username (unique)
├── phone_number (unique, nullable - mocked verification)
├── display_name
├── avatar_url
├── password_hash
├── created_at
└── last_seen

conversations
├── id (PK)
├── is_group (boolean)
├── name (nullable - only used when is_group=True)
└── created_at

conversation_members          <- join table: users <-> conversations
├── id (PK)
├── conversation_id (FK -> conversations.id)
├── user_id (FK -> users.id)
├── is_admin (boolean - group admin controls)
└── joined_at

messages
├── id (PK)
├── conversation_id (FK -> conversations.id)
├── sender_id (FK -> users.id)
├── content (text)
└── created_at

message_status                <- per-recipient delivery/read tracking
├── id (PK)
├── message_id (FK -> messages.id)
├── user_id (FK -> users.id)       (the recipient this status is for)
├── status ("sent" | "delivered" | "read")
└── updated_at
```

**Why a separate `message_status` table instead of a status column on
`messages`?** In a group chat, each message has multiple recipients, and each
one reads it at a different time. A single `status` column on `messages`
could only represent one global status, not "read by Bob but only delivered
to Carol." This table gives one row per (message, recipient) pair.

---

## API Overview

### REST endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create a new user, returns a JWT |
| POST | `/auth/login` | Login with username/password/mocked OTP, returns a JWT |
| GET | `/auth/me` | Get the currently logged-in user |
| GET | `/contacts` | List all other users |
| GET | `/contacts/search?q=` | Search users by name/username |
| POST | `/contacts/add` | Validate a username exists before starting a chat |
| POST | `/conversations` | Create a 1:1 or group conversation |
| GET | `/conversations` | List my conversations, sorted by latest activity |
| GET | `/conversations/{id}` | Get one conversation + its members |
| POST | `/conversations/{id}/members` | Add a member (admin only) |
| DELETE | `/conversations/{id}/members/{user_id}` | Remove a member (admin only) |
| GET | `/messages/{conversation_id}` | Load message history for a chat |
| POST | `/messages/{conversation_id}/read` | Mark all messages in a chat as read |
| GET | `/messages/info/{message_id}` | Per-recipient delivery/read status with timestamps (sender only) - powers the "tap the checkmarks" message info panel |

### WebSocket: `/ws?token=<jwt>`
Single persistent connection per logged-in user.

**Client → Server events:**
- `{"type": "message", "conversation_id": 3, "content": "hey"}`
- `{"type": "typing", "conversation_id": 3, "is_typing": true}`
- `{"type": "read", "conversation_id": 3}`

**Server → Client events:**
- `{"type": "new_message", "message": {...}}`
- `{"type": "typing", "conversation_id": 3, "user_id": 7, "is_typing": true}`
- `{"type": "message_status", "message_id": 12, "status": "sent"|"delivered"|"read"}`
- `{"type": "presence", "user_id": 7, "online": true|false}`
- `{"type": "conversation_updated", "conversation_id": 3}` - sent when a group's
  membership changes, so all affected tabs refresh without a manual reload

**Group chat tick logic:** the status reported to a message's sender is an
*aggregate* across all recipients (worst-case wins) - e.g. a group message
only shows the blue "read" double-tick once **every** member has read it,
not just one. Tap the checkmarks on your own message to see the exact
per-person breakdown (sent/delivered/read + timestamp) via the message info
panel - this mirrors how Signal/WhatsApp group read receipts actually work.

---

## Setup Instructions

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed               # populates demo data (run once)
uvicorn app.main:app --reload --port 8000
```
Backend runs at `http://localhost:8000`. Interactive API docs at
`http://localhost:8000/docs`.

### Frontend
```bash
cd frontend
cp .env.local.example .env.local   # defaults already point at localhost:8000
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

### Demo accounts (created by the seed script)
| Username | Password | OTP |
|---|---|---|
| alice | password123 | 0000 |
| bob | password123 | 0000 |
| carol | password123 | 0000 |
| dave | password123 | 0000 |

Open two different browsers (or one normal + one incognito window), log in
as two different users, and message between them to see real-time delivery,
typing indicators, and read receipts live.

---

## Assumptions & Simplifications

- **OTP is hardcoded to `0000`** — no real SMS provider is integrated, per
  the assignment's "can be mocked" allowance.
- **"Contacts" = all registered users.** There's no separate contact-request/
  approval flow; any registered user can message any other registered user,
  similar to how Signal lets you message anyone who has your number once
  they're in your phone contacts.
- **Encryption is fully mocked.** Messages are stored as plain text in
  SQLite. No Signal Protocol / key exchange is implemented, as explicitly
  permitted by the brief.
- **One WebSocket connection per session**, not per conversation — this
  keeps the architecture simpler and is how most production chat apps
  (Slack, Discord, WhatsApp Web) actually work.
- **Voice/video calls, Stories, and Linked Devices** each have a real,
  clickable entry point in the UI (a phone icon in the chat header, a
  circle icon in the sidebar header, and a row inside Settings,
  respectively) that opens a "Coming Soon" modal, rather than being
  silently absent from the app.
- **Group "last seen"/online status** is shown per-member inside Group Info
  rather than as a single aggregate status, since a group doesn't have one
  online/offline state.
- **Group membership changes post a real chat message** ("Alice added Carol
  to the group") rather than a separate "system message" type, since the
  schema doesn't need a new column for this - it's a normal message
  authored by the admin who made the change, broadcast live to everyone
  in the group (including the newly added/removed member, so their
  sidebar updates without a manual refresh).

---

## Deployment

**Backend → Render (free tier Web Service)**
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `PYTHON_VERSION` environment variable set to `3.11.9` - Render's default
  Python (3.14 at time of writing) is too new to have pre-built install
  files for some dependencies (`pydantic-core`), which otherwise forces a
  Rust source build that fails in Render's read-only build filesystem.

**Frontend → Vercel**
- Root directory: `frontend` (auto-detected as Next.js)
- Environment variables:
  - `NEXT_PUBLIC_API_URL` = the Render backend URL (`https://...onrender.com`)
  - `NEXT_PUBLIC_WS_URL` = the same host, but `wss://` instead of `https://`
    (secure WebSocket protocol, required since the backend is served over HTTPS)