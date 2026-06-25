"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Info, MessageCircle, ArrowLeft, Phone, X } from "lucide-react";
import { Conversation, Message, User } from "../lib/types";
import { getConversationTitle, getConversationAvatar, formatLastSeen } from "../lib/helpers";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";
import Modal from "./Modal";

interface Props {
  conversation: Conversation | null;
  currentUser: User;
  messages: Message[];
  onSend: (content: string, replyToId?: number) => void;
  onTyping: (isTyping: boolean) => void;
  typingUserNames: string[];
  onlineUserIds: Set<number>;
  onShowGroupInfo: () => void;
  onMessageInfo: (messageId: number) => void;
  onBack?: () => void; // mobile only - returns to the conversation list
}

export default function ChatWindow({
  conversation,
  currentUser,
  messages,
  onSend,
  onTyping,
  typingUserNames,
  onlineUserIds,
  onShowGroupInfo,
  onMessageInfo,
  onBack,
}: Props) {
  const [draft, setDraft] = useState("");
  const [showCallSoon, setShowCallSoon] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUserNames.length]);

  // Clear any pending reply if the conversation itself changes
  useEffect(() => {
    setReplyingTo(null);
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-white dark:bg-zinc-900 text-ink-faint dark:text-zinc-500">
        <div className="w-16 h-16 rounded-2xl bg-signal-blue/10 dark:bg-signal-blue/20 flex items-center justify-center mb-4">
          <MessageCircle size={32} className="text-signal-blue" />
        </div>
        <p className="text-sm">Select a conversation to start messaging</p>
      </div>
    );
  }

  const title = getConversationTitle(conversation, currentUser.id);
  const avatarUrl = getConversationAvatar(conversation, currentUser.id);
  const otherMember = conversation.members.find((m) => m.user.id !== currentUser.id);
  const isOnline = otherMember ? onlineUserIds.has(otherMember.user.id) : false;

  function handleChange(value: string) {
    setDraft(value);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed, replyingTo?.id);
    setDraft("");
    setReplyingTo(null);
    onTyping(false);
  }

  function getSenderName(msg: Message) {
    if (msg.sender_id === currentUser.id) return "You";
    return conversation?.members.find((m) => m.user.id === msg.sender_id)?.user.display_name || "Unknown";
  }

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-5 py-3 border-b border-panel-border dark:border-zinc-700">
        <div className="flex items-center gap-1 md:gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 -ml-1 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-800 text-ink-muted dark:text-zinc-400 shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <button
            className="flex items-center gap-3 min-w-0"
            onClick={conversation.is_group ? onShowGroupInfo : undefined}
          >
            {conversation.is_group ? (
              <div className="w-10 h-10 rounded-full bg-ink-faint/30 dark:bg-zinc-700 flex items-center justify-center text-ink-muted dark:text-zinc-300 font-medium shrink-0">
                {title.slice(0, 2).toUpperCase()}
              </div>
            ) : (
              <Avatar src={avatarUrl} name={title} size={40} />
            )}
            <div className="text-left min-w-0">
              <p className="font-medium text-[15px] truncate dark:text-zinc-100">{title}</p>
              <p className="text-xs text-ink-muted dark:text-zinc-400">
                {conversation.is_group
                  ? `${conversation.members.length} members`
                  : isOnline
                  ? "Online"
                  : otherMember
                  ? `Last seen ${formatLastSeen(otherMember.user.last_seen)}`
                  : ""}
              </p>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCallSoon(true)}
            title="Voice/video call (coming soon)"
            className="p-2 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-800 text-ink-muted dark:text-zinc-400 shrink-0"
          >
            <Phone size={19} />
          </button>
          {conversation.is_group && (
            <button
              onClick={onShowGroupInfo}
              className="p-2 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-800 text-ink-muted dark:text-zinc-400 shrink-0"
            >
              <Info size={19} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-faint dark:text-zinc-500 mt-10">
            No messages yet. Say hello! 👋
          </p>
        )}
        {messages.map((msg) => {
          const sender = conversation.members.find((m) => m.user.id === msg.sender_id);
          const showSenderName =
            conversation.is_group && msg.sender_id !== currentUser.id
              ? sender?.user.display_name
              : undefined;
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender_id === currentUser.id}
              showSenderName={showSenderName}
              onInfoClick={() => onMessageInfo(msg.id)}
              onReplyClick={() => {
                setReplyingTo(msg);
                inputRef.current?.focus();
              }}
            />
          );
        })}
        {typingUserNames.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-xs text-ink-faint dark:text-zinc-500 ml-1">
              {typingUserNames.join(", ")} {typingUserNames.length === 1 ? "is" : "are"} typing...
            </span>
            <div className="bg-bubble-incoming dark:bg-zinc-700 rounded-bubble rounded-bl-md px-4 py-2.5 flex gap-1 w-fit">
              <span className="w-1.5 h-1.5 bg-ink-faint dark:bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-ink-faint dark:bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-ink-faint dark:bg-zinc-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview bar */}
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 bg-panel-sidebar dark:bg-zinc-800 border-t border-panel-border dark:border-zinc-700">
          <div className="flex-1 min-w-0 pl-2.5 border-l-2 border-signal-blue">
            <p className="text-xs font-medium text-signal-blue">
              Replying to {getSenderName(replyingTo)}
            </p>
            <p className="text-xs text-ink-muted dark:text-zinc-400 truncate">{replyingTo.content}</p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1.5 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-700 text-ink-muted dark:text-zinc-400 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 md:px-4 py-3 border-t border-panel-border dark:border-zinc-700">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type a message"
          className="flex-1 bg-panel-sidebar dark:bg-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-[14.5px] outline-none focus:ring-2 focus:ring-signal-blue/30 placeholder:dark:text-zinc-500"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="w-10 h-10 rounded-full bg-signal-blue hover:bg-signal-blue-dark text-white flex items-center justify-center disabled:opacity-40 transition shrink-0"
        >
          <Send size={17} />
        </button>
      </form>

      {showCallSoon && (
        <Modal title="Voice & video calls" onClose={() => setShowCallSoon(false)}>
          <p className="text-sm text-ink-muted dark:text-zinc-400">
            Voice and video calling are coming soon. For now, you can stay in
            touch with {title} right here in chat.
          </p>
        </Modal>
      )}
    </div>
  );
}