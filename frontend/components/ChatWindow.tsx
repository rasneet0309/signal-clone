"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Info, MessageCircle } from "lucide-react";
import { Conversation, Message, User } from "../lib/types";
import { getConversationTitle, getConversationAvatar, formatLastSeen } from "../lib/helpers";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";

interface Props {
  conversation: Conversation | null;
  currentUser: User;
  messages: Message[];
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  typingUserNames: string[];
  onlineUserIds: Set<number>;
  onShowGroupInfo: () => void;
  onMessageInfo: (messageId: number) => void;
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
}: Props) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUserNames.length]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white text-ink-faint">
        <div className="w-16 h-16 rounded-2xl bg-signal-blue/10 flex items-center justify-center mb-4">
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
    onSend(trimmed);
    setDraft("");
    onTyping(false);
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-panel-border">
        <button
          className="flex items-center gap-3"
          onClick={conversation.is_group ? onShowGroupInfo : undefined}
        >
          {conversation.is_group ? (
            <div className="w-10 h-10 rounded-full bg-ink-faint/30 flex items-center justify-center text-ink-muted font-medium">
              {title.slice(0, 2).toUpperCase()}
            </div>
          ) : (
            <Avatar src={avatarUrl} name={title} size={40} />
          )}
          <div className="text-left">
            <p className="font-medium text-[15px]">{title}</p>
            <p className="text-xs text-ink-muted">
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
        {conversation.is_group && (
          <button
            onClick={onShowGroupInfo}
            className="p-2 rounded-full hover:bg-panel-hover text-ink-muted"
          >
            <Info size={19} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-faint mt-10">
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
            />
          );
        })}
        {typingUserNames.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-xs text-ink-faint ml-1">
              {typingUserNames.join(", ")} {typingUserNames.length === 1 ? "is" : "are"} typing...
            </span>
            <div className="bg-bubble-incoming rounded-bubble rounded-bl-md px-4 py-2.5 flex gap-1 w-fit">
              <span className="w-1.5 h-1.5 bg-ink-faint rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-ink-faint rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-ink-faint rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-panel-border">
        <input
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type a message"
          className="flex-1 bg-panel-sidebar rounded-full px-4 py-2.5 text-[14.5px] outline-none focus:ring-2 focus:ring-signal-blue/30"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="w-10 h-10 rounded-full bg-signal-blue hover:bg-signal-blue-dark text-white flex items-center justify-center disabled:opacity-40 transition shrink-0"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
