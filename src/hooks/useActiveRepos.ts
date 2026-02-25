"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "campermap_active_repos";

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useActiveRepos() {
  const [activeRepos, setActiveRepos] = useState<string[]>([]);

  // Load from localStorage after hydration
  useEffect(() => {
    setActiveRepos(loadFromStorage());
  }, []);

  const toggleRepo = useCallback((id: string) => {
    setActiveRepos((prev) => {
      const next = prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const removeRepo = useCallback((id: string) => {
    setActiveRepos((prev) => {
      const next = prev.filter((r) => r !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { activeRepos, toggleRepo, removeRepo };
}
