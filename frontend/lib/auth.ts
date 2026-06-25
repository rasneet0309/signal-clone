import { User } from "./types";

// Tiny helpers around localStorage so we don't repeat ourselves.
// In a bigger app we'd use React Context, but for this assignment's
// scope, simple localStorage + reading it on page load is enough.

export function saveSession(token: string, user: User) {
  localStorage.setItem("signal_token", token);
  localStorage.setItem("signal_user", JSON.stringify(user));
}

export function getSavedUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("signal_user");
  return raw ? JSON.parse(raw) : null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("signal_token");
}

export function clearSession() {
  localStorage.removeItem("signal_token");
  localStorage.removeItem("signal_user");
}
