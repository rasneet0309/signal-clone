"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../lib/api";
import { User } from "../lib/types";
import Avatar from "./Avatar";
import Modal from "./Modal";

interface Props {
  onClose: () => void;
  onCreated: (conversationId: number) => void;
}

export default function NewChatModal({ onClose, onCreated }: Props) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get("/contacts").then((res) => setContacts(res.data));
  }, []);

  const filtered = contacts.filter(
    (c) =>
      c.display_name.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
  );

  async function startChat(username: string) {
    setCreating(true);
    try {
      const res = await api.post("/conversations", {
        is_group: false,
        member_usernames: [username],
      });
      onCreated(res.data.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal title="New chat" onClose={onClose}>
      <div className="flex items-center gap-2 bg-panel-sidebar rounded-lg px-3 py-2 mb-4">
        <Search size={16} className="text-ink-faint" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or username"
          className="bg-transparent outline-none text-sm flex-1"
        />
      </div>
      <div className="max-h-72 overflow-y-auto space-y-1">
        {filtered.length === 0 && (
          <p className="text-sm text-ink-faint text-center py-4">No contacts found</p>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            disabled={creating}
            onClick={() => startChat(c.username)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-panel-hover text-left disabled:opacity-50"
          >
            <Avatar src={c.avatar_url} name={c.display_name} size={38} />
            <div>
              <p className="text-sm font-medium">{c.display_name}</p>
              <p className="text-xs text-ink-muted">@{c.username}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
