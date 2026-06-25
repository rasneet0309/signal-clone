"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import { User } from "../lib/types";
import Avatar from "./Avatar";
import Modal from "./Modal";

interface Props {
  onClose: () => void;
  onCreated: (conversationId: number) => void;
}

export default function NewGroupModal({ onClose, onCreated }: Props) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/contacts").then((res) => setContacts(res.data));
  }, []);

  function toggle(username: string) {
    const next = new Set(selected);
    if (next.has(username)) next.delete(username);
    else next.add(username);
    setSelected(next);
  }

  async function handleCreate() {
    setError("");
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    if (selected.size === 0) {
      setError("Pick at least one member");
      return;
    }
    setCreating(true);
    try {
      const res = await api.post("/conversations", {
        is_group: true,
        name: name.trim(),
        member_usernames: Array.from(selected),
      });
      onCreated(res.data.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        className="w-full border border-panel-border dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-signal-blue/30 mb-4 placeholder:dark:text-zinc-500"
      />

      <p className="text-xs font-medium text-ink-muted dark:text-zinc-400 mb-2">
        Add members ({selected.size} selected)
      </p>
      <div className="max-h-56 overflow-y-auto space-y-1 mb-3">
        {contacts.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.username)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition ${
              selected.has(c.username)
                ? "bg-signal-blue/10 dark:bg-signal-blue/20"
                : "hover:bg-panel-hover dark:hover:bg-zinc-700"
            }`}
          >
            <Avatar src={c.avatar_url} name={c.display_name} size={36} />
            <div className="flex-1">
              <p className="text-sm font-medium dark:text-zinc-100">{c.display_name}</p>
              <p className="text-xs text-ink-muted dark:text-zinc-400">@{c.username}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected.has(c.username)
                  ? "bg-signal-blue border-signal-blue"
                  : "border-panel-border dark:border-zinc-600"
              }`}
            >
              {selected.has(c.username) && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full bg-signal-blue hover:bg-signal-blue-dark text-white rounded-xl py-2.5 font-medium transition disabled:opacity-60"
      >
        {creating ? "Creating..." : "Create group"}
      </button>
    </Modal>
  );
}