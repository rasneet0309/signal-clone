"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import api from "../../lib/api";
import { saveSession } from "../../lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        username
      )}`;
      const res = await api.post("/auth/register", {
        username,
        display_name: displayName,
        phone_number: phone || null,
        password,
        avatar_url,
      });
      saveSession(res.data.access_token, res.data.user);
      router.push("/chat");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel-sidebar dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-panel-border dark:border-zinc-800 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-signal-blue flex items-center justify-center mb-3">
            <MessageCircle className="text-white" size={28} />
          </div>
          <h1 className="text-xl font-semibold dark:text-zinc-100">Create your account</h1>
          <p className="text-sm text-ink-muted dark:text-zinc-400 mt-1">It only takes a minute</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink-muted dark:text-zinc-400">Display name</label>
            <input
              className="mt-1 w-full rounded-xl border border-panel-border dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2.5 outline-none focus:ring-2 focus:ring-signal-blue/40"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alice Johnson"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-muted dark:text-zinc-400">Username</label>
            <input
              className="mt-1 w-full rounded-xl border border-panel-border dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2.5 outline-none focus:ring-2 focus:ring-signal-blue/40"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alice"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-muted dark:text-zinc-400">
              Phone number (optional, mocked)
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-panel-border dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2.5 outline-none focus:ring-2 focus:ring-signal-blue/40"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 0100"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-muted dark:text-zinc-400">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-panel-border dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2.5 outline-none focus:ring-2 focus:ring-signal-blue/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-signal-blue hover:bg-signal-blue-dark text-white rounded-xl py-2.5 font-medium transition disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-center text-ink-muted dark:text-zinc-400 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-signal-blue font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}