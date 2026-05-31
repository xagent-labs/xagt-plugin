"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface WatchlistEntry {
  id: string;
  symbol: string;
  addedAt: string;
  chain?: string;
}

interface WatchlistState {
  entries: WatchlistEntry[];
  add: (e: Omit<WatchlistEntry, "addedAt"> & { addedAt?: string }) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      entries: [],
      add: (e) => {
        if (get().has(e.id)) return;
        set({
          entries: [
            ...get().entries,
            { ...e, addedAt: e.addedAt ?? new Date().toISOString() },
          ],
        });
      },
      remove: (id) => set({ entries: get().entries.filter((e) => e.id !== id) }),
      clear: () => set({ entries: [] }),
      has: (id) => get().entries.some((e) => e.id === id),
    }),
    {
      name: "xagent.watchlist",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
