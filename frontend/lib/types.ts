// These mirror the Pydantic schemas on the backend (schemas.py) so the
// frontend and backend agree on the "shape" of data.

export interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_seen: string;
}

export interface ConversationMember {
  user: User;
  is_admin: boolean;
}

export interface Conversation {
  id: number;
  is_group: boolean;
  name: string | null;
  created_at: string;
  members: ConversationMember[];
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  // these two are tracked client-side / via websocket events, not stored on the message itself
  status?: "sending" | "sent" | "delivered" | "read";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
