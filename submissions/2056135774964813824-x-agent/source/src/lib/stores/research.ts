"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ResearchRun {
  id: string;
  query: string;
  answer: string;
  createdAt: string;
  model?: string;
  status: "streaming" | "done" | "error";
}

interface ResearchState {
  runs: ResearchRun[];
  add: (run: ResearchRun) => void;
  patch: (id: string, patch: Partial<ResearchRun>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useResearchHistory = create<ResearchState>()(
  persist(
    (set, get) => ({
      runs: [],
      add: (run) => set({ runs: [run, ...get().runs].slice(0, 50) }),
      patch: (id, patch) =>
        set({
          runs: get().runs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }),
      remove: (id) => set({ runs: get().runs.filter((r) => r.id !== id) }),
      clear: () => set({ runs: [] }),
    }),
    {
      name: "xagent.research-history",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
