import { create } from 'zustand';
import type { ActivityProgress } from '../utils/types';

interface ProgressStore {
  activities: ActivityProgress[];
  streakDays: number;
  isLoading: boolean;
  setActivities: (activities: ActivityProgress[]) => void;
  setStreakDays: (days: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useProgressStore = create<ProgressStore>((set) => ({
  activities: [],
  streakDays: 0,
  isLoading: false,
  setActivities: (activities) => set({ activities }),
  setStreakDays: (streakDays) => set({ streakDays }),
  setLoading: (isLoading) => set({ isLoading }),
}));
