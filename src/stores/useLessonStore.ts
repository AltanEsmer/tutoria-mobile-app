import { create } from 'zustand';
import type { SessionData, WordData } from '../utils/types';

interface LessonStore {
  currentSession: SessionData | null;
  currentWord: WordData | null;
  isLoading: boolean;
  error: string | null;
  setSession: (session: SessionData | null) => void;
  setCurrentWord: (word: WordData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useLessonStore = create<LessonStore>((set) => ({
  currentSession: null,
  currentWord: null,
  isLoading: false,
  error: null,
  setSession: (currentSession) => set({ currentSession }),
  setCurrentWord: (currentWord) => set({ currentWord }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ currentSession: null, currentWord: null, isLoading: false, error: null }),
}));
