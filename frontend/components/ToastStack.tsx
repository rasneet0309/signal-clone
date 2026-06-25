"use client";

import { MessageCircle } from "lucide-react";

export interface ToastItem {
  id: number;
  title: string;
  body: string;
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

/**
 * Renders a stack of toast notifications in the top-right corner.
 * Used to notify the user about new messages arriving in a conversation
 * they're not currently looking at - mirrors the "Notifications / toasts"
 * requirement from the Signal Experience section of the brief.
 */
export default function ToastStack({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className="bg-white dark:bg-zinc-800 border border-panel-border dark:border-zinc-700 rounded-xl shadow-lg p-3 flex items-start gap-3 text-left animate-in slide-in-from-top-2"
        >
          <div className="w-9 h-9 rounded-full bg-signal-blue/10 dark:bg-signal-blue/20 flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-signal-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium dark:text-zinc-100 truncate">{t.title}</p>
            <p className="text-xs text-ink-muted dark:text-zinc-400 truncate">{t.body}</p>
          </div>
        </button>
      ))}
    </div>
  );
}