"use client";

import { useState } from "react";
import { Search, SquarePen, Users, CirclePlay } from "lucide-react";
import { Conversation, User, Message } from "../lib/types";
import { getConversationTitle, getConversationAvatar, formatTime } from "../lib/helpers";
import Avatar from "./Avatar";
import Modal from "./Modal";

interface Props {
  conversations: Conversation[];
  currentUser: User;
  selectedId: number | null;
  onSelect: (id: number) => void;
  lastMessages: Record<number, Message | undefined>;
  unreadCounts: Record<number, number>;
  onlineUserIds: Set<number>;
  onNewChat: () => void;
  onNewGroup: () => void;
}

export default function ConversationList({
  conversations,
  currentUser,
  selectedId,
  onSelect,
  lastMessages,
  unreadCounts,
  onlineUserIds,
  onNewChat,
  onNewGroup,
}: Props) {
  const [search, setSearch] = useState("");
  const [showStoriesSoon, setShowStoriesSoon] = useState(false);

  const filtered = conversations.filter((c) => {
    const title = getConversationTitle(c, currentUser.id).toLowerCase();
    return title.includes(search.toLowerCase());
  });

  return (
    <div className="w-full h-full bg-panel-sidebar dark:bg-zinc-900 border-r border-panel-border dark:border-zinc-700 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar src={currentUser.avatar_url} name={currentUser.display_name} size={36} />
          <span className="font-semibold text-[15px] dark:text-zinc-100">Chats</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowStoriesSoon(true)}
            title="Stories"
            className="p-2 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-800 text-ink-muted dark:text-zinc-400"
          >
            <CirclePlay size={19} />
          </button>
          <button
            onClick={onNewGroup}
            title="New group"
            className="p-2 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-800 text-ink-muted dark:text-zinc-400"
          >
            <Users size={19} />
          </button>
          <button
            onClick={onNewChat}
            title="New chat"
            className="p-2 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-800 text-ink-muted dark:text-zinc-400"
          >
            <SquarePen size={19} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-panel-border dark:border-zinc-700 rounded-lg px-3 py-2">
          <Search size={16} className="text-ink-faint dark:text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="bg-transparent outline-none text-sm flex-1 dark:text-zinc-100 placeholder:dark:text-zinc-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-ink-faint dark:text-zinc-500 mt-8">No conversations yet</p>
        )}
        {filtered.map((convo) => {
          const title = getConversationTitle(convo, currentUser.id);
          const avatarUrl = getConversationAvatar(convo, currentUser.id);
          const lastMsg = lastMessages[convo.id];
          const unread = unreadCounts[convo.id] || 0;
          const otherMember = convo.members.find((m) => m.user.id !== currentUser.id);
          const isOnline = otherMember ? onlineUserIds.has(otherMember.user.id) : false;

          return (
            <button
              key={convo.id}
              onClick={() => onSelect(convo.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                selectedId === convo.id
                  ? "bg-signal-blue/10 dark:bg-signal-blue/20"
                  : "hover:bg-panel-hover dark:hover:bg-zinc-800"
              }`}
            >
              {convo.is_group ? (
                <div className="w-11 h-11 rounded-full bg-ink-faint/30 dark:bg-zinc-700 flex items-center justify-center text-ink-muted dark:text-zinc-300 font-medium">
                  {title.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <Avatar src={avatarUrl} name={title} size={44} online={isOnline} />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[14.5px] truncate dark:text-zinc-100">{title}</span>
                  {lastMsg && (
                    <span className="text-xs text-ink-faint dark:text-zinc-500 shrink-0 ml-2">
                      {formatTime(lastMsg.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-muted dark:text-zinc-400 truncate">
                    {lastMsg ? lastMsg.content : "No messages yet"}
                  </span>
                  {unread > 0 && (
                    <span className="ml-2 shrink-0 bg-signal-blue text-white text-[11px] font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showStoriesSoon && (
        <Modal title="Stories" onClose={() => setShowStoriesSoon(false)}>
          <p className="text-sm text-ink-muted dark:text-zinc-400">
            Stories are coming soon - share photos and updates that
            disappear after 24 hours, visible to your contacts.
          </p>
        </Modal>
      )}
    </div>
  );
}