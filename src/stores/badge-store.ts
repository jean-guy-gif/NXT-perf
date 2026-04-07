import { create } from "zustand";
import type { BadgeKey } from "@/lib/badges";

interface BadgeStore {
  queue: BadgeKey[];
  currentCelebration: BadgeKey | null;
  queueCelebrations: (keys: BadgeKey[]) => void;
  nextCelebration: () => void;
  clearCelebrations: () => void;
}

export const useBadgeStore = create<BadgeStore>((set, get) => ({
  queue: [],
  currentCelebration: null,

  queueCelebrations: (keys) => {
    if (keys.length === 0) return;
    const current = get().currentCelebration;
    if (current) {
      // Already showing one — add to queue
      set((s) => ({ queue: [...s.queue, ...keys] }));
    } else {
      // Show first immediately, queue the rest
      set({ currentCelebration: keys[0], queue: keys.slice(1) });
    }
  },

  nextCelebration: () => {
    const { queue } = get();
    if (queue.length > 0) {
      set({ currentCelebration: queue[0], queue: queue.slice(1) });
    } else {
      set({ currentCelebration: null });
    }
  },

  clearCelebrations: () => set({ queue: [], currentCelebration: null }),
}));
