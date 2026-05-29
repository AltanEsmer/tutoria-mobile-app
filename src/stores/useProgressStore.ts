import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import apiClient from '../services/api/client';
import { PROGRESS_STORE_STORAGE_KEY } from '../utils/constants';
import { toDateKey } from '../utils/progress';
import type { ActivityProgress, LocalActivityEntry, OfflineQueueItem } from '../utils/types';

interface ProgressStore {
  activities: ActivityProgress[];
  streakDays: number;
  isLoading: boolean;
  /** Timestamp of the last invalidate() call; used to trigger re-fetch when the tab is already focused. */
  lastInvalidatedAt: number;
  offlineQueue: OfflineQueueItem[];
  isSyncing: boolean;
  /**
   * On-device history of every word each child has practiced, keyed by
   * profileId → activityId. Persisted so the Progress page can render real data
   * when the backend `GET /v1/progress` call fails. Scoped per profile so
   * siblings sharing a device never see each other's progress. See
   * `src/utils/progress.ts` for derivation.
   */
  activityLog: Record<string, Record<string, LocalActivityEntry>>;
  setActivities: (activities: ActivityProgress[]) => void;
  setStreakDays: (days: number) => void;
  setLoading: (loading: boolean) => void;
  /** Clear cached activities/streak so the next Progress-tab focus fetches fresh data. */
  invalidate: () => void;
  /** Record one word attempt into the on-device activity log (date defaults to today). */
  recordLocalActivity: (
    profileId: string,
    entry: { id: string; displayText: string; isCorrect: boolean },
    dateKey?: string,
  ) => void;
  /** Fold a successful server progress response into the local log so it seeds future offline views. */
  mergeServerActivities: (profileId: string, activities: ActivityProgress[]) => void;
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
      activityLog: {},

      setActivities: (activities) => set({ activities }),
      setStreakDays: (streakDays) => set({ streakDays }),
      setLoading: (isLoading) => set({ isLoading }),
      // Note: invalidate clears only the live render arrays — never activityLog,
      // which is the durable fallback used when the backend progress call fails.
      invalidate: () =>
        set({ activities: [], streakDays: 0, isLoading: false, lastInvalidatedAt: Date.now() }),

      recordLocalActivity: (profileId, { id, displayText, isCorrect }, dateKey) => {
        if (!profileId || !id) return;
        const date = dateKey ?? toDateKey(new Date());
        set((state) => {
          const profileLog = state.activityLog[profileId] ?? {};
          const prev = profileLog[id];
          const correctDates = prev ? [...prev.correctDates] : [];
          if (isCorrect && !correctDates.includes(date)) {
            correctDates.push(date);
          }
          return {
            activityLog: {
              ...state.activityLog,
              [profileId]: {
                ...profileLog,
                [id]: {
                  id,
                  displayText: displayText || prev?.displayText || id,
                  correctDates,
                  lastDate: date,
                  lastIsCorrect: isCorrect,
                },
              },
            },
          };
        });
      },

      mergeServerActivities: (profileId, activities) => {
        if (!profileId || !activities || activities.length === 0) return;
        set((state) => {
          const profileLog = { ...(state.activityLog[profileId] ?? {}) };
          for (const a of activities) {
            if (!a.id) continue;
            const prev = profileLog[a.id];
            const serverDate = a.lastDate ? a.lastDate.split('T')[0] : null;
            const correctDates = new Set(prev?.correctDates ?? []);
            // The server returns a single lastDate, not full history; seed it when
            // the activity was correct so local daysCorrect/streak don't regress.
            if (serverDate && a.isCorrect) {
              correctDates.add(serverDate);
            }
            profileLog[a.id] = {
              id: a.id,
              displayText: a.displayText || prev?.displayText || a.id,
              correctDates: Array.from(correctDates),
              lastDate: serverDate ?? prev?.lastDate ?? null,
              lastIsCorrect: a.isCorrect,
            };
          }
          return { activityLog: { ...state.activityLog, [profileId]: profileLog } };
        });
      },

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
              await apiClient.post(item.endpoint, item.payload, {
                headers: item.headers,
              });
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
      partialize: (state) => ({
        offlineQueue: state.offlineQueue,
        activityLog: state.activityLog,
      }),
    },
  ),
);
