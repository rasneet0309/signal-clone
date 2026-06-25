"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import api from "../../lib/api";
import { getSavedUser, getToken, clearSession } from "../../lib/auth";
import { Conversation, Message, User } from "../../lib/types";
import { useWebSocket } from "../../hooks/useWebSocket";
import ConversationList from "../../components/ConversationList";
import ChatWindow from "../../components/ChatWindow";
import NewChatModal from "../../components/NewChatModal";
import NewGroupModal from "../../components/NewGroupModal";
import GroupInfoModal from "../../components/GroupInfoModal";
import MessageInfoModal from "../../components/MessageInfoModal";

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messagesByConvo, setMessagesByConvo] = useState<Record<number, Message[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [typingByConvo, setTypingByConvo] = useState<Record<number, Set<number>>>({});
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [infoMessageId, setInfoMessageId] = useState<number | null>(null);

  const { onEvent, sendMessage, sendTyping, sendRead } = useWebSocket();
  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;

  // ---- Initial load: confirm auth, load user + conversations ----
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setCurrentUser(getSavedUser());
    api.get("/conversations").then((res) => setConversations(res.data));
  }, [router]);

  // ---- Load message history whenever a new conversation is selected ----
  useEffect(() => {
    if (selectedId === null) return;
    if (messagesByConvo[selectedId]) return; // already loaded
    api.get(`/messages/${selectedId}`).then((res) => {
      setMessagesByConvo((prev) => ({ ...prev, [selectedId]: res.data }));
    });
  }, [selectedId, messagesByConvo]);

  // ---- Mark as read when opening a conversation ----
  useEffect(() => {
    if (selectedId === null) return;
    api.post(`/messages/${selectedId}/read`);
    sendRead(selectedId);
    setUnreadCounts((prev) => ({ ...prev, [selectedId]: 0 }));
  }, [selectedId, sendRead]);

  // ---- React to real-time WebSocket events ----
  useEffect(() => {
    const unsubscribe = onEvent((event) => {
      if (event.type === "new_message") {
        const msg: Message = event.message;
        setMessagesByConvo((prev) => ({
          ...prev,
          [msg.conversation_id]: [...(prev[msg.conversation_id] || []), msg],
        }));

        // Bump that conversation to the top of the sidebar
        setConversations((prev) => [...prev]);

        if (
          msg.conversation_id !== selectedIdRef.current &&
          msg.sender_id !== currentUser?.id
        ) {
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1,
          }));
        } else if (msg.conversation_id === selectedIdRef.current) {
          // I'm looking at this chat right now - tell the server I read it instantly
          sendRead(msg.conversation_id);
        }
      }

      if (event.type === "message_status") {
        setMessagesByConvo((prev) => {
          const updated = { ...prev };
          for (const convoId of Object.keys(updated)) {
            updated[Number(convoId)] = updated[Number(convoId)].map((m) =>
              m.id === event.message_id ? { ...m, status: event.status as any } : m
            );
          }
          return updated;
        });
      }

      if (event.type === "typing") {
        setTypingByConvo((prev) => {
          const set = new Set(prev[event.conversation_id] || []);
          if (event.is_typing) set.add(event.user_id);
          else set.delete(event.user_id);
          return { ...prev, [event.conversation_id]: set };
        });
      }

      if (event.type === "presence") {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (event.online) next.add(event.user_id);
          else next.delete(event.user_id);
          return next;
        });
      }

      if (event.type === "conversation_updated") {
        // A group's membership changed (someone added/removed) - refetch
        // the conversation list so the sidebar and member list stay in sync
        // for everyone, without anyone needing to manually refresh.
        api.get("/conversations").then((res) => setConversations(res.data));
      }
    });
    return unsubscribe;
  }, [onEvent, currentUser, sendRead]);

  const handleSend = useCallback(
    (content: string) => {
      if (selectedId === null || !currentUser) return;
      sendMessage(selectedId, content);
    },
    [selectedId, currentUser, sendMessage]
  );

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (selectedId === null) return;
      sendTyping(selectedId, isTyping);
    },
    [selectedId, sendTyping]
  );

  function handleConversationCreated(id: number) {
    setShowNewChat(false);
    setShowNewGroup(false);
    api.get("/conversations").then((res) => {
      setConversations(res.data);
      setSelectedId(id);
    });
  }

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!currentUser) return null;

  const selectedConvo = conversations.find((c) => c.id === selectedId) || null;
  const lastMessages = Object.fromEntries(
    conversations.map((c) => [c.id, messagesByConvo[c.id]?.slice(-1)[0]])
  );

  // Sort conversations by most recent activity (last message, else created_at)
  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = lastMessages[a.id]?.created_at || a.created_at;
    const bTime = lastMessages[b.id]?.created_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const typingUserNames = selectedConvo
    ? Array.from(typingByConvo[selectedConvo.id] || [])
        .filter((id) => id !== currentUser.id)
        .map((id) => selectedConvo.members.find((m) => m.user.id === id)?.user.display_name)
        .filter(Boolean) as string[]
    : [];

  return (
    <div className="h-screen flex">
      <div className="flex flex-col">
        <ConversationList
          conversations={sortedConversations}
          currentUser={currentUser}
          selectedId={selectedId}
          onSelect={setSelectedId}
          lastMessages={lastMessages}
          unreadCounts={unreadCounts}
          onlineUserIds={onlineUserIds}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
        />
        <div className="border-t border-panel-border bg-panel-sidebar px-4 py-2.5 flex items-center justify-between">
          <button
            className="text-xs text-ink-muted flex items-center gap-1.5 hover:text-ink"
            title="Settings (placeholder)"
          >
            <Settings size={14} /> Settings
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-ink-muted flex items-center gap-1.5 hover:text-red-500"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <ChatWindow
        conversation={selectedConvo}
        currentUser={currentUser}
        messages={selectedConvo ? messagesByConvo[selectedConvo.id] || [] : []}
        onSend={handleSend}
        onTyping={handleTyping}
        typingUserNames={typingUserNames}
        onlineUserIds={onlineUserIds}
        onShowGroupInfo={() => setShowGroupInfo(true)}
        onMessageInfo={(messageId) => setInfoMessageId(messageId)}
      />
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={handleConversationCreated}
        />
      )}
      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onCreated={handleConversationCreated}
        />
      )}
      {showGroupInfo && selectedConvo && (
        <GroupInfoModal
          conversation={selectedConvo}
          currentUser={currentUser}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={(updated) => {
            setConversations((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
          }}
        />
      )}
      {infoMessageId !== null && (
        <MessageInfoModal
          messageId={infoMessageId}
          onClose={() => setInfoMessageId(null)}
        />
      )}
    </div>
  );
}
