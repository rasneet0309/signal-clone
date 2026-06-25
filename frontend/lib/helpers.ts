import { Conversation, User } from "./types";

/** For a 1:1 conversation, returns the OTHER person (not me). */
export function getOtherMember(convo: Conversation, myId: number): User | null {
  const other = convo.members.find((m) => m.user.id !== myId);
  return other ? other.user : null;
}

/** What to show as the conversation's title in the sidebar/header. */
export function getConversationTitle(convo: Conversation, myId: number): string {
  if (convo.is_group) return convo.name || "Group";
  const other = getOtherMember(convo, myId);
  return other?.display_name || "Unknown";
}

export function getConversationAvatar(convo: Conversation, myId: number): string | null {
  if (convo.is_group) return null; // groups show initials of the group name
  const other = getOtherMember(convo, myId);
  return other?.avatar_url || null;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
