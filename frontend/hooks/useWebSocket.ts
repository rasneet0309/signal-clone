"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { WS_URL } from "../lib/api";
import { getToken } from "../lib/auth";

/**
 * This hook opens ONE WebSocket connection when the chat app loads,
 * and keeps it open the whole time the user is using the app
 * (it does NOT reconnect every time you switch conversations).
 *
 * It exposes:
 * - sendMessage / sendTyping / sendRead -> functions to send events TO the server
 * - onEvent -> register a callback to react to events COMING FROM the server
 */

type ServerEvent =
  | { type: "new_message"; message: any }
  | { type: "typing"; conversation_id: number; user_id: number; is_typing: boolean }
  | { type: "message_status"; message_id: number; status: string; user_id?: number }
  | { type: "presence"; user_id: number; online: boolean }
  | { type: "conversation_updated"; conversation_id: number };

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<((event: ServerEvent) => void)[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const data: ServerEvent = JSON.parse(event.data);
      listenersRef.current.forEach((cb) => cb(data));
    };

    return () => {
      ws.close();
    };
  }, []);

  const onEvent = useCallback((callback: (event: ServerEvent) => void) => {
    listenersRef.current.push(callback);
    // returns an "unsubscribe" function for cleanup in useEffect
    return () => {
      listenersRef.current = listenersRef.current.filter((cb) => cb !== callback);
    };
  }, []);

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const sendMessage = useCallback(
    (conversation_id: number, content: string, reply_to_id?: number) => {
      send({ type: "message", conversation_id, content, reply_to_id });
    },
    [send]
  );

  const sendTyping = useCallback(
    (conversation_id: number, is_typing: boolean) => {
      send({ type: "typing", conversation_id, is_typing });
    },
    [send]
  );

  const sendRead = useCallback(
    (conversation_id: number) => {
      send({ type: "read", conversation_id });
    },
    [send]
  );

  return { connected, onEvent, sendMessage, sendTyping, sendRead };
}