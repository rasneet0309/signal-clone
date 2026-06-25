import { Check, CheckCheck, Clock, Reply } from "lucide-react";
import { Message } from "../lib/types";
import { formatTime } from "../lib/helpers";

interface Props {
  message: Message;
  isMine: boolean;
  showSenderName?: string; // shown above bubble in group chats
  onInfoClick?: () => void; // only used when isMine - opens the message info modal
  onReplyClick?: () => void; // starts composing a reply to this message
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
  onReplyClick,
}: Props) {
  return (
    <div className={`group flex ${isMine ? "justify-end" : "justify-start"} mb-1.5 items-center gap-1.5`}>
      {isMine && onReplyClick && (
        <button
          onClick={onReplyClick}
          title="Reply"
          className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-700 text-ink-faint dark:text-zinc-400 order-first"
        >
          <Reply size={15} />
        </button>
      )}
      <div className={`max-w-[60%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        {showSenderName && (
          <span className="text-xs text-ink-muted dark:text-zinc-400 ml-3 mb-0.5">{showSenderName}</span>
        )}
        <div
          className={`rounded-bubble px-4 py-2 text-[14.5px] leading-relaxed ${
            isMine
              ? "bg-signal-blue text-white rounded-br-md"
              : "bg-bubble-incoming dark:bg-zinc-700 text-ink dark:text-zinc-100 rounded-bl-md"
          }`}
        >
          {message.reply_to && (
            <div
              className={`mb-1.5 pl-2.5 border-l-2 ${
                isMine ? "border-white/50" : "border-signal-blue/60"
              }`}
            >
              <p className={`text-xs font-medium ${isMine ? "text-white/90" : "text-signal-blue"}`}>
                {message.reply_to.sender_name}
              </p>
              <p className={`text-xs truncate max-w-[220px] ${isMine ? "text-white/70" : "text-ink-muted dark:text-zinc-400"}`}>
                {message.reply_to.content}
              </p>
            </div>
          )}
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
          <span
            onClick={isMine ? onInfoClick : undefined}
            title={isMine ? "Tap to see who's read this" : undefined}
            className={`inline-flex items-center gap-1 ml-2 text-[11px] ${
              isMine
                ? "text-white/70 cursor-pointer hover:text-white"
                : "text-ink-faint dark:text-zinc-400"
            } align-bottom`}
          >
            {formatTime(message.created_at)}
            {isMine && <StatusIcon status={message.status} />}
          </span>
        </div>
      </div>
      {!isMine && onReplyClick && (
        <button
          onClick={onReplyClick}
          title="Reply"
          className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-700 text-ink-faint dark:text-zinc-400"
        >
          <Reply size={15} />
        </button>
      )}
    </div>
  );
}