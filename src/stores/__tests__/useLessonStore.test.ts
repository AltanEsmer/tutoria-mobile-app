import { useLessonStore } from '../useLessonStore';
import type { SessionData } from '../../utils/types';

const mockSession: SessionData = {
  words: ['w1', 'w2', 'w3'],
  wordData: [
    { id: 'w1', display_text: 'cat', audio_path: undefined, target_ipa: '/kæt/' },
    { id: 'w2', display_text: 'bat', audio_path: undefined, target_ipa: '/bæt/' },
    { id: 'w3', display_text: 'hat', audio_path: undefined, target_ipa: '/hæt/' },
  ],
  totalWords: 3,
  position: 0,
  started: Date.now(),
  completedWords: [],
  remainingWords: ['w1', 'w2', 'w3'],
  moduleName: 'Test Module',
  failedWords: [],
};

describe('useLessonStore', () => {
  beforeEach(() => {
    useLessonStore.getState().resetSession();
    useLessonStore.getState().reset();
  });

  describe('hydrateFromSession', () => {
    it('sets currentWordIndex to 0 for a fresh session', () => {
      useLessonStore.getState().hydrateFromSession(mockSession);
      expect(useLessonStore.getState().currentWordIndex).toBe(0);
      expect(useLessonStore.getState().sessionComplete).toBe(false);
    });

    it('resumes from the first incomplete word when completedWords is populated', () => {
      const partial: SessionData = {
        ...mockSession,
        completedWords: ['w1', 'w2'],
        position: 0,
      };
      useLessonStore.getState().hydrateFromSession(partial);
      expect(useLessonStore.getState().currentWordIndex).toBe(2);
    });

    it('marks session complete when all words are done', () => {
      const done: SessionData = {
        ...mockSession,
        completedWords: ['w1', 'w2', 'w3'],
        position: 3,
      };
      useLessonStore.getState().hydrateFromSession(done);
      expect(useLessonStore.getState().sessionComplete).toBe(true);
    });
  });

  describe('recordAttempt', () => {
    beforeEach(() => {
      useLessonStore.getState().hydrateFromSession(mockSession);
    });

    it('increments attempt count on each call', () => {
      useLessonStore.getState().recordAttempt('w1', false);
      useLessonStore.getState().recordAttempt('w1', false);
      expect(useLessonStore.getState().getAttemptCount('w1')).toBe(2);
    });

    it('marks word completed on a passing attempt', () => {
      useLessonStore.getState().recordAttempt('w1', true);
      expect(useLessonStore.getState().completedWords).toContain('w1');
    });

    it('increments sessionScore on a passing attempt', () => {
      useLessonStore.getState().recordAttempt('w1', true);
      expect(useLessonStore.getState().sessionScore).toBe(1);
    });

    it('does NOT mark word failed before MAX_WORD_ATTEMPTS', () => {
      useLessonStore.getState().recordAttempt('w1', false);
      useLessonStore.getState().recordAttempt('w1', false);
      expect(useLessonStore.getState().failedWords).not.toContain('w1');
    });

    it('marks word failed at MAX_WORD_ATTEMPTS (3)', () => {
      useLessonStore.getState().recordAttempt('w1', false);
      useLessonStore.getState().recordAttempt('w1', false);
      useLessonStore.getState().recordAttempt('w1', false);
      expect(useLessonStore.getState().failedWords).toContain('w1');
    });

    it('does not double-add to completedWords', () => {
      useLessonStore.getState().recordAttempt('w1', true);
      useLessonStore.getState().recordAttempt('w1', true);
      const count = useLessonStore.getState().completedWords.filter((w) => w === 'w1').length;
      expect(count).toBe(1);
    });
  });

  describe('advanceWord', () => {
    it('increments currentWordIndex', () => {
      useLessonStore.getState().hydrateFromSession(mockSession);
      useLessonStore.getState().setSession(mockSession);
      useLessonStore.getState().advanceWord();
      expect(useLessonStore.getState().currentWordIndex).toBe(1);
    });

    it('sets sessionComplete when advancing past the last word', () => {
      useLessonStore.getState().hydrateFromSession({
        ...mockSession,
        completedWords: ['w1', 'w2'],
        position: 2,
      });
      useLessonStore.getState().setSession(mockSession);
      useLessonStore.getState().advanceWord(); // index 2 → 3 = totalWords
      expect(useLessonStore.getState().sessionComplete).toBe(true);
    });
  });

  describe('cooldown', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('isModuleOnCooldown returns false for a module without cooldown', () => {
      expect(useLessonStore.getState().isModuleOnCooldown('mod-1')).toBe(false);
    });

    it('isModuleOnCooldown returns true immediately after setCooldown', () => {
      useLessonStore.getState().setCooldown('mod-1');
      expect(useLessonStore.getState().isModuleOnCooldown('mod-1')).toBe(true);
    });

    it('isModuleOnCooldown returns false after cooldown expires', () => {
      useLessonStore.getState().setCooldown('mod-1');
      jest.advanceTimersByTime(13 * 60 * 60 * 1000); // 13 hours
      expect(useLessonStore.getState().isModuleOnCooldown('mod-1')).toBe(false);
    });
  });

  describe('resetSession', () => {
    it('clears all session tracking data', () => {
      useLessonStore.getState().hydrateFromSession(mockSession);
      useLessonStore.getState().recordAttempt('w1', true);
      useLessonStore.getState().resetSession();
      const state = useLessonStore.getState();
      expect(state.currentWordIndex).toBe(0);
      expect(state.completedWords).toEqual([]);
      expect(state.failedWords).toEqual([]);
      expect(state.sessionScore).toBe(0);
      expect(state.sessionComplete).toBe(false);
      expect(state.wordAttempts).toEqual({});
    });
  });
});
