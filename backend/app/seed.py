"""
Run this once after setting up the backend to fill the database with
fake users, conversations, and messages - so the app isn't empty when
you (or your evaluator) open it.

Run it with:  python -m app.seed
"""
from datetime import datetime, timedelta
from .database import SessionLocal, engine, Base
from . import models, auth

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# All seeded users share the same password for convenience during demo/eval
DEMO_PASSWORD = "password123"


def get_or_create_user(username, display_name, phone, avatar_seed):
    user = db.query(models.User).filter(models.User.username == username).first()
    if user:
        return user
    user = models.User(
        username=username,
        display_name=display_name,
        phone_number=phone,
        avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={avatar_seed}",
        password_hash=auth.hash_password(DEMO_PASSWORD),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


print("Seeding users...")
alice = get_or_create_user("alice", "Alice Johnson", "+1111111111", "alice")
bob = get_or_create_user("bob", "Bob Smith", "+2222222222", "bob")
carol = get_or_create_user("carol", "Carol Lee", "+3333333333", "carol")
dave = get_or_create_user("dave", "Dave Patel", "+4444444444", "dave")

print(f"Created/found {db.query(models.User).count()} users")
print("Demo login -> any username above, password: password123, otp: 0000")


def get_or_create_dm(user_a, user_b):
    existing = (
        db.query(models.Conversation)
        .filter(models.Conversation.is_group == False)
        .join(models.ConversationMember)
        .filter(models.ConversationMember.user_id.in_([user_a.id, user_b.id]))
        .all()
    )
    for convo in existing:
        member_ids = {m.user_id for m in convo.members}
        if member_ids == {user_a.id, user_b.id}:
            return convo

    convo = models.Conversation(is_group=False)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    db.add(models.ConversationMember(conversation_id=convo.id, user_id=user_a.id))
    db.add(models.ConversationMember(conversation_id=convo.id, user_id=user_b.id))
    db.commit()
    return convo


def add_message(convo, sender, content, minutes_ago):
    msg = models.Message(
        conversation_id=convo.id,
        sender_id=sender.id,
        content=content,
        created_at=datetime.utcnow() - timedelta(minutes=minutes_ago),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


print("Seeding conversations + messages...")

# DM: Alice <-> Bob
dm1 = get_or_create_dm(alice, bob)
if not db.query(models.Message).filter(models.Message.conversation_id == dm1.id).first():
    add_message(dm1, alice, "Hey Bob! Did you check the designs?", 120)
    add_message(dm1, bob, "Yes, looking at them now", 115)
    add_message(dm1, bob, "They look great, just one comment on the header", 114)
    add_message(dm1, alice, "Sure, what's up?", 100)

# DM: Alice <-> Carol
dm2 = get_or_create_dm(alice, carol)
if not db.query(models.Message).filter(models.Message.conversation_id == dm2.id).first():
    add_message(dm2, carol, "Lunch tomorrow?", 30)
    add_message(dm2, alice, "Yes! 1pm?", 25)

# Group: Project Team (Alice, Bob, Carol, Dave) - Alice is admin
group = db.query(models.Conversation).filter(
    models.Conversation.name == "Project Team"
).first()
if not group:
    group = models.Conversation(is_group=True, name="Project Team")
    db.add(group)
    db.commit()
    db.refresh(group)
    db.add(models.ConversationMember(conversation_id=group.id, user_id=alice.id, is_admin=True))
    db.add(models.ConversationMember(conversation_id=group.id, user_id=bob.id))
    db.add(models.ConversationMember(conversation_id=group.id, user_id=carol.id))
    db.add(models.ConversationMember(conversation_id=group.id, user_id=dave.id))
    db.commit()

    add_message(group, alice, "Welcome everyone to the project group!", 200)
    add_message(group, bob, "Excited to get started", 195)
    add_message(group, dave, "Same here, let's sync tomorrow", 190)
    add_message(group, carol, "Sounds good 👍", 180)

print("Seeding complete!")
db.close()
