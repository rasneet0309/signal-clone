"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import api from "../../lib/api";
import { saveSession } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("0000");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { username, password, otp });
      saveSession(res.data.access_token, res.data.user);
      router.push("/chat");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
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
          <h1 className="text-xl font-semibold dark:text-zinc-100">Welcome back</h1>
          <p className="text-sm text-ink-muted dark:text-zinc-400 mt-1">Sign in to continue messaging</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink-muted dark:text-zinc-400">Username</label>
            <input
              className="mt-1 w-full rounded-xl border border-panel-border dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2.5 outline-none focus:ring-2 focus:ring-signal-blue/40 placeholder:dark:text-zinc-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alice"
              required
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
          <div>
            <label className="text-sm font-medium text-ink-muted dark:text-zinc-400">
              Verification code (mocked - use 0000)
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-panel-border dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2.5 outline-none focus:ring-2 focus:ring-signal-blue/40"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="0000"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-signal-blue hover:bg-signal-blue-dark text-white rounded-xl py-2.5 font-medium transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-center text-ink-muted dark:text-zinc-400 mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-signal-blue font-medium">
            Create one
          </Link>
        </p>

        <p className="text-xs text-center text-ink-faint dark:text-zinc-500 mt-4">
          Demo accounts: alice / bob / carol / dave — password: password123
        </p>
      </div>
    </div>
  );
}