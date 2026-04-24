import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import apiClient from '../services/api/client';
import { PROGRESS_STORE_STORAGE_KEY } from '../utils/constants';
import type { ActivityProgress, OfflineQueueItem } from '../utils/types';

interface ProgressStore {
  activities: ActivityProgress[];
  streakDays: number;
  isLoading: boolean;
  /** Timestamp of the last invalidate() call; used to trigger re-fetch when the tab is already focused. */
  lastInvalidatedAt: number;
  offlineQueue: OfflineQueueItem[];
  isSyncing: boolean;
  setActivities: (activities: ActivityProgress[]) => void;
  setStreakDays: (days: number) => void;
  setLoading: (loading: boolean) => void;
  /** Clear cached activities/streak so the next Progress-tab focus fetches fresh data. */
  invalidate: () => void;
  addToQueue: (item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount'>) => void;
  removeFromQueue: (id: string) => void;
  drainQueue: () => Promise<void>;
  clearQueue: () => void;
}

const MAX_RETRIES = 5;

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      activities: [],
      streakDays: 0,
      isLoading: false,
      lastInvalidatedAt: 0,
      offlineQueue: [],
      isSyncing: false,

      setActivities: (activities) => set({ activities }),
      setStreakDays: (streakDays) => set({ streakDays }),
      setLoading: (isLoading) => set({ isLoading }),
      invalidate: () =>
        set({ activities: [], streakDays: 0, isLoading: false, lastInvalidatedAt: Date.now() }),

      addToQueue: (item) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        set((state) => ({
          offlineQueue: [
            ...state.offlineQueue,
            { ...item, id, createdAt: Date.now(), retryCount: 0 },
          ],
        }));
      },

      removeFromQueue: (id) => {
        set((state) => ({
          offlineQueue: state.offlineQueue.filter((item) => item.id !== id),
        }));
      },

      drainQueue: async () => {
        if (get().isSyncing) return;
        set({ isSyncing: true });
        try {
          const queue = [...get().offlineQueue];
          for (const item of queue) {
            try {
              await apiClient.post(item.endpoint, item.payload);
              get().removeFromQueue(item.id);
            } catch (error: unknown) {
              const status =
                error &&
                typeof error === 'object' &&
                'response' in error &&
                error.response &&
                typeof error.response === 'object' &&
                'status' in error.response
                  ? (error.response as { status: number }).status
                  : null;

              if (status === 409) {
                get().removeFromQueue(item.id);
              } else {
                const newRetryCount = item.retryCount + 1;
                if (newRetryCount >= MAX_RETRIES) {
                  get().removeFromQueue(item.id);
                } else {
                  set((state) => ({
                    offlineQueue: state.offlineQueue.map((q) =>
                      q.id === item.id ? { ...q, retryCount: newRetryCount } : q,
                    ),
                  }));
                }
              }
            }
          }
        } finally {
          set({ isSyncing: false });
        }
      },

      clearQueue: () => set({ offlineQueue: [] }),
    }),
    {
      name: PROGRESS_STORE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ offlineQueue: state.offlineQueue }),
    },
  ),
);
