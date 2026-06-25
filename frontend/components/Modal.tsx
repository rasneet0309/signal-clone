"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border dark:border-zinc-700">
          <h2 className="font-semibold text-[15px] dark:text-zinc-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-panel-hover dark:hover:bg-zinc-700 text-ink-muted dark:text-zinc-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}