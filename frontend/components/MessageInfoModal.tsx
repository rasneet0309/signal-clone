"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck, Clock } from "lucide-react";
import api from "../lib/api";
import { formatTime } from "../lib/helpers";
import Avatar from "./Avatar";
import Modal from "./Modal";

interface RecipientStatus {
  user: {
    id: number;
    display_name: string;
    avatar_url: string | null;
  };
  status: "sent" | "delivered" | "read";
  updated_at: string;
}

interface Props {
  messageId: number;
  onClose: () => void;
}

function StatusLine({ status }: { status: string }) {
  if (status === "read")
    return (
      <span className="flex items-center gap-1 text-signal-blue text-xs font-medium">
        <CheckCheck size={14} /> Read
      </span>
    );
  if (status === "delivered")
    return (
      <span className="flex items-center gap-1 text-ink-muted text-xs font-medium">
        <CheckCheck size={14} /> Delivered
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-ink-faint text-xs font-medium">
      <Clock size={12} /> Sent
    </span>
  );
}

export default function MessageInfoModal({ messageId, onClose }: Props) {
  const [statuses, setStatuses] = useState<RecipientStatus[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/messages/info/${messageId}`)
      .then((res) => setStatuses(res.data))
      .catch((err) =>
        setError(err.response?.data?.detail || "Could not load message info")
      );
  }, [messageId]);

  return (
    <Modal title="Message info" onClose={onClose}>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!statuses && !error && (
        <p className="text-sm text-ink-faint text-center py-4">Loading...</p>
      )}
      {statuses && statuses.length === 0 && (
        <p className="text-sm text-ink-faint text-center py-4">
          No recipients to show yet.
        </p>
      )}
      {statuses && statuses.length > 0 && (
        <div className="space-y-1">
          {statuses.map((s) => (
            <div
              key={s.user.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-panel-hover"
            >
              <Avatar src={s.user.avatar_url} name={s.user.display_name} size={36} />
              <div className="flex-1">
                <p className="text-sm font-medium">{s.user.display_name}</p>
                <p className="text-xs text-ink-faint">{formatTime(s.updated_at)}</p>
              </div>
              <StatusLine status={s.status} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}