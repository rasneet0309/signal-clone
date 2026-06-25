"""
ConnectionManager keeps track of which users currently have an open
WebSocket connection (i.e. who is "online" right now), and gives us
helper functions to send a message to one user or broadcast to a group.

A user can have the app open in multiple tabs, so we store a LIST of
connections per user_id, not just one.
"""
from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections

    async def send_to_user(self, user_id: int, payload: dict):
        """Send a JSON payload to every open tab/connection a user has."""
        for ws in self.active_connections.get(user_id, []):
            await ws.send_json(payload)

    async def broadcast_to_users(self, user_ids: List[int], payload: dict):
        for user_id in user_ids:
            await self.send_to_user(user_id, payload)


# A single shared instance used across the whole app
manager = ConnectionManager()
