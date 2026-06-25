"use client";

import { useState } from "react";
import { UserMinus, UserPlus, Shield } from "lucide-react";
import api from "../lib/api";
import { Conversation, User } from "../lib/types";
import Avatar from "./Avatar";
import Modal from "./Modal";

interface Props {
  conversation: Conversation;
  currentUser: User;
  onClose: () => void;
  onUpdated: (updated: Conversation) => void;
}

export default function GroupInfoModal({
  conversation,
  currentUser,
  onClose,
  onUpdated,
}: Props) {
  const [usernameToAdd, setUsernameToAdd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const myMembership = conversation.members.find((m) => m.user.id === currentUser.id);
  const isAdmin = myMembership?.is_admin || false;

  async function handleAdd() {
    if (!usernameToAdd.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/conversations/${conversation.id}/members`, {
        username: usernameToAdd.trim(),
      });
      onUpdated(res.data);
      setUsernameToAdd("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add member");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(userId: number) {
    setBusy(true);
    setError("");
    try {
      const res = await api.delete(`/conversations/${conversation.id}/members/${userId}`);
      onUpdated(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to remove member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={conversation.name || "Group info"} onClose={onClose}>
      <p className="text-xs font-medium text-ink-muted dark:text-zinc-400 mb-2">
        {conversation.members.length} members
      </p>
      <div className="space-y-1 max-h-56 overflow-y-auto mb-4">
        {conversation.members.map((m) => (
          <div
            key={m.user.id}
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-panel-hover dark:hover:bg-zinc-700"
          >
            <Avatar src={m.user.avatar_url} name={m.user.display_name} size={36} />
            <div className="flex-1">
              <p className="text-sm font-medium flex items-center gap-1.5 dark:text-zinc-100">
                {m.user.display_name}
                {m.is_admin && <Shield size={13} className="text-signal-blue" />}
              </p>
              <p className="text-xs text-ink-muted dark:text-zinc-400">@{m.user.username}</p>
            </div>
            {isAdmin && m.user.id !== currentUser.id && (
              <button
                onClick={() => handleRemove(m.user.id)}
                disabled={busy}
                title="Remove member"
                className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 disabled:opacity-50"
              >
                <UserMinus size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div>
          <p className="text-xs font-medium text-ink-muted dark:text-zinc-400 mb-2">Add a member</p>
          <div className="flex gap-2">
            <input
              value={usernameToAdd}
              onChange={(e) => setUsernameToAdd(e.target.value)}
              placeholder="username"
              className="flex-1 border border-panel-border dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-signal-blue/30 placeholder:dark:text-zinc-500"
            />
            <button
              onClick={handleAdd}
              disabled={busy}
              className="px-3 rounded-lg bg-signal-blue text-white flex items-center gap-1.5 text-sm font-medium disabled:opacity-60"
            >
              <UserPlus size={15} />
              Add
            </button>
          </div>
        </div>
      )}

      {!isAdmin && (
        <p className="text-xs text-ink-faint dark:text-zinc-500">Only group admins can add or remove members.</p>
      )}

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </Modal>
  );
}