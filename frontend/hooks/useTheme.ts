"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Manages light/dark theme by toggling a "dark" class on the <html>
 * element (Tailwind's class-based dark mode strategy) and remembering
 * the choice in localStorage so it persists across page reloads.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("signal_theme");
    const prefersDark =
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("signal_theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  return { isDark, toggleTheme };
}