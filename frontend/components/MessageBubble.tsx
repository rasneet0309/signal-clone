import { Check, CheckCheck, Clock } from "lucide-react";
import { Message } from "../lib/types";
import { formatTime } from "../lib/helpers";

interface Props {
  message: Message;
  isMine: boolean;
  showSenderName?: string; // shown above bubble in group chats
  onInfoClick?: () => void; // only used when isMine - opens the message info modal
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "read") return <CheckCheck size={14} className="text-blue-300" />;
  if (status === "delivered") return <CheckCheck size={14} className="text-white/70" />;
  if (status === "sending") return <Clock size={12} className="text-white/70" />;
  return <Check size={14} className="text-white/70" />;
}

export default function MessageBubble({
  message,
  isMine,
  showSenderName,
  onInfoClick,
}: Props) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1.5`}>
      <div className={`max-w-[60%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        {showSenderName && (
          <span className="text-xs text-ink-muted ml-3 mb-0.5">{showSenderName}</span>
        )}
        <div
          className={`rounded-bubble px-4 py-2 text-[14.5px] leading-relaxed ${
            isMine
              ? "bg-signal-blue text-white rounded-br-md"
              : "bg-bubble-incoming text-ink rounded-bl-md"
          }`}
        >
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
          <span
            onClick={isMine ? onInfoClick : undefined}
            title={isMine ? "Tap to see who's read this" : undefined}
            className={`inline-flex items-center gap-1 ml-2 text-[11px] ${
              isMine ? "text-white/70 cursor-pointer hover:text-white" : "text-ink-faint"
            } align-bottom`}
          >
            {formatTime(message.created_at)}
            {isMine && <StatusIcon status={message.status} />}
          </span>
        </div>
      </div>
    </div>
  );
}