import { create } from 'zustand';
import type { PronunciationCheckResponse, SessionData, WordData } from '../utils/types';
import { COOLDOWN_HOURS } from '../utils/constants';

// Defined inline — not yet in constants.ts
const MAX_WORD_ATTEMPTS = 3;
const COOLDOWN_MS = COOLDOWN_HOURS * 3600 * 1000;

interface LessonStore {
  // ─── Existing state ───────────────────────────────────────────
  currentSession: SessionData | null;
  currentWord: WordData | null;
  isLoading: boolean;
  error: string | null;

  // ─── Session tracking ─────────────────────────────────────────
  currentWordIndex: number;
  completedWords: string[];
  failedWords: string[];
  wordAttempts: Record<string, number>;
  pronunciationResults: Record<string, PronunciationCheckResponse>;
  sessionScore: number;
  sessionComplete: boolean;

  // ─── Cooldown (in-memory; AsyncStorage not installed) ─────────
  cooldownTimestamps: Record<string, number>;

  // ─── Existing actions ─────────────────────────────────────────
  setSession: (session: SessionData | null) => void;
  setCurrentWord: (word: WordData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // ─── New actions ──────────────────────────────────────────────
  hydrateFromSession: (session: SessionData) => void;
  recordAttempt: (wordId: string, passed: boolean, feedback?: PronunciationCheckResponse) => void;
  advanceWord: () => void;
  markWordCompleted: (wordId: string) => void;
  markWordFailed: (wordId: string) => void;
  resetSession: () => void;
  isModuleOnCooldown: (moduleId: string) => boolean;
  setCooldown: (moduleId: string) => void;
  getAttemptCount: (wordId: string) => number;
}

const sessionDefaults = {
  currentWordIndex: 0,
  completedWords: [] as string[],
  failedWords: [] as string[],
  wordAttempts: {} as Record<string, number>,
  pronunciationResults: {} as Record<string, PronunciationCheckResponse>,
  sessionScore: 0,
  sessionComplete: false,
};

export const useLessonStore = create<LessonStore>((set, get) => ({
  // ─── Existing state ───────────────────────────────────────────
  currentSession: null,
  currentWord: null,
  isLoading: false,
  error: null,

  // ─── Session tracking defaults ────────────────────────────────
  ...sessionDefaults,

  // ─── Cooldown ─────────────────────────────────────────────────
  cooldownTimestamps: {},

  // ─── Existing actions ─────────────────────────────────────────
  setSession: (currentSession) => set({ currentSession }),
  setCurrentWord: (currentWord) => set({ currentWord }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ currentSession: null, currentWord: null, isLoading: false, error: null }),

  // ─── New actions ──────────────────────────────────────────────
  hydrateFromSession: (session) => {
    const completedWords = session.completedWords ?? [];
    const completedSet = new Set(completedWords);
    const totalWords = session.wordData?.length ?? session.totalWords ?? 0;

    // Find the first word in wordData that has not been completed yet.
    // This handles: (a) correct position returned by backend, (b) position=0 with completedWords
    // populated (backend resume bug), (c) wordData containing only remaining words.
    let effectivePosition = session.wordData
      ? session.wordData.findIndex((w) => !completedSet.has(w.id))
      : -1;

    if (effectivePosition === -1) {
      // All words completed (or no wordData) — mark session complete
      effectivePosition = totalWords;
    }

    // Never go backward past what the backend explicitly reported
    effectivePosition = Math.max(effectivePosition, session.position ?? 0);

    set({
      currentWordIndex: effectivePosition,
      completedWords,
      failedWords: session.failedWords ?? [],
      sessionScore: completedWords.length,
      sessionComplete: totalWords > 0 && effectivePosition >= totalWords,
    });
  },

  recordAttempt: (wordId, passed, feedback) => {
    const attempts = (get().wordAttempts[wordId] || 0) + 1;

    set((s) => ({
      wordAttempts: { ...s.wordAttempts, [wordId]: attempts },
      ...(feedback
        ? { pronunciationResults: { ...s.pronunciationResults, [wordId]: feedback } }
        : {}),
    }));

    if (passed) {
      get().markWordCompleted(wordId);
      set((s) => ({ sessionScore: s.sessionScore + 1 }));
    } else if (attempts >= MAX_WORD_ATTEMPTS) {
      get().markWordFailed(wordId);
    }
  },

  advanceWord: () => {
    const { currentWordIndex, currentSession } = get();
    const nextIndex = currentWordIndex + 1;
    const totalWords = currentSession?.wordData?.length ?? currentSession?.totalWords ?? 0;
    set({
      currentWordIndex: nextIndex,
      ...(nextIndex >= totalWords ? { sessionComplete: true } : {}),
    });
  },

  markWordCompleted: (wordId) =>
    set((s) => ({
      completedWords: s.completedWords.includes(wordId)
        ? s.completedWords
        : [...s.completedWords, wordId],
    })),

  markWordFailed: (wordId) =>
    set((s) => ({
      failedWords: s.failedWords.includes(wordId) ? s.failedWords : [...s.failedWords, wordId],
    })),

  resetSession: () => set({ ...sessionDefaults }),

  isModuleOnCooldown: (moduleId) => {
    const timestamp = get().cooldownTimestamps[moduleId];
    return timestamp !== undefined && Date.now() - timestamp < COOLDOWN_MS;
  },

  setCooldown: (moduleId) =>
    set((s) => ({ cooldownTimestamps: { ...s.cooldownTimestamps, [moduleId]: Date.now() } })),

  getAttemptCount: (wordId) => get().wordAttempts[wordId] || 0,
}));
