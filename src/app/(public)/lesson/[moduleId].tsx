import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { usePronunciation } from '@/hooks/usePronunciation';
import {
  completeSession,
  completeWord,
  saveProgress,
  startOrResumeModule,
  resolveSessionAudioPaths,
} from '@/services/api';
import { prefetchAudioFiles } from '@/services/cache';
import { useLessonStore } from '@/stores/useLessonStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { PronunciationFeedback } from '@/components/lesson/PronunciationFeedback';
import { WordDisplay } from '@/components/lesson/WordDisplay';
import type { PronunciationCheckResponse } from '@/utils/types';
import { MAX_PREFETCH_WORDS } from '@/utils/constants';

const MAX_WORD_ATTEMPTS = 3;
const PASSING_THRESHOLD = 80;

export default function LessonScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const router = useRouter();

  const store = useLessonStore();
  const { activeProfile } = useProfileStore();
  const audio = useAudio({ autoPlay: true });
  const pronunciation = usePronunciation();
  const haptics = useHaptics();

  const [feedbackResult, setFeedbackResult] = useState<PronunciationCheckResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLoadedRef = useRef(false);
  const isAdvancingRef = useRef(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load module on mount ──────────────────────────────────────────────────
  const loadModule = useCallback(async () => {
    if (!activeProfile || !moduleId) return;
    store.setLoading(true);
    store.setError(null);
    try {
      const session = await startOrResumeModule(moduleId, activeProfile.id);
      // Resolve audio_path for words that only have audio_files (IPA-based curriculum format)
      const resolvedSession = await resolveSessionAudioPaths(session);
      store.setSession(resolvedSession);
      store.hydrateFromSession(resolvedSession);
      if (__DEV__) {
        console.log('[Lesson] session.wordData[0]:', JSON.stringify(resolvedSession.wordData[0]));
        console.log(
          '[Lesson] session.position:',
          resolvedSession.position,
          'totalWords:',
          resolvedSession.totalWords,
        );
      }
      const startWord =
        resolvedSession.wordData[resolvedSession.position] ?? resolvedSession.wordData[0] ?? null;
      store.setCurrentWord(startWord);
      if (startWord?.audio_path) {
        audio.setAudioPath(startWord.audio_path);
      }
      // Pre-fetch audio for upcoming words (best-effort)
      const audioPaths = resolvedSession.wordData
        .slice(0, MAX_PREFETCH_WORDS)
        .map((w) => w.audio_path)
        .filter((p): p is string => !!p);
      prefetchAudioFiles(audioPaths).catch(() => {
        // Audio pre-fetch is best-effort
      });
    } catch (err: unknown) {
      const isAxiosLike = (e: unknown): e is { response?: { status?: number } } =>
        typeof e === 'object' && e !== null && 'response' in e;
      if (isAxiosLike(err) && err.response?.status === 404) {
        store.setError('This lesson is not available right now. Try a different card.');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load lesson';
        store.setError(message);
      }
    } finally {
      store.setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, activeProfile]);

  useEffect(() => {
    if (activeProfile && !store.currentSession && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadModule();
    }
    return () => {
      store.reset();
      store.resetSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Auto-play audio when the current word changes ─────────────────────────
  useEffect(() => {
    if (store.currentWord?.audio_path) {
      audio.setAudioPath(store.currentWord.audio_path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.currentWordIndex]);

  // ─── Navigate to results when session completes ────────────────────────────
  useEffect(() => {
    if (store.sessionComplete && moduleId) {
      store.setCooldown(moduleId);
      // Best-effort backend notification — don't block navigation
      if (activeProfile) {
        completeSession(moduleId, activeProfile.id)
          .then(() => useProgressStore.getState().invalidate())
          .catch(() => {
            // Queue for offline sync if needed — session completion is best-effort
          });
      }
      router.replace(`/lesson/results?moduleId=${moduleId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.sessionComplete]);

  // ─── Derived values ────────────────────────────────────────────────────────
  const currentWord = store.currentWord;
  const wordId = currentWord?.id ?? '';
  const attemptCount = store.getAttemptCount(wordId);
  const attemptsRemaining = Math.max(0, MAX_WORD_ATTEMPTS - attemptCount);

  // ─── Advance to the next word ──────────────────────────────────────────────
  const advanceToNextWord = useCallback(
    async (isCorrect: boolean) => {
      if (!moduleId || !activeProfile || !currentWord) return;
      if (isAdvancingRef.current) return;
      isAdvancingRef.current = true;

      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }

      const activityKey = (currentWord.display_text ?? '').trim();

      setIsSubmitting(true);
      try {
        await completeWord(moduleId, {
          profileId: activeProfile.id,
          wordId: currentWord.id,
          isCorrect,
        });
        // Write to the progress table so GET /v1/progress reflects this attempt.
        // Use display_text as the stable activity identifier — curriculum word IDs are
        // R2-local and may not match D1 activity UUIDs. display_text is consistent and
        // the backend uses it to find-or-create the activity record.
        // Guard: skip saveProgress entirely when display_text is empty (some R2 curriculum
        // words carry only audio_files IPA payloads and have no display_text).
        if (activityKey) {
          await saveProgress(activeProfile.id, activityKey, {
            isCorrect,
            displayText: activityKey,
          });
        }
        // Invalidate the progress store so the next Progress-tab focus fetches fresh data.
        useProgressStore.getState().invalidate();
      } catch {
        // Queue failed requests for offline sync
        useProgressStore.getState().addToQueue({
          type: 'completeWord',
          endpoint: `/v1/modules/${moduleId}/word`,
          payload: {
            profileId: activeProfile.id,
            wordId: currentWord.id,
            isCorrect,
          },
        });
        if (activityKey) {
          useProgressStore.getState().addToQueue({
            type: 'saveProgress',
            endpoint: `/v1/progress/${activeProfile.id}/${encodeURIComponent(activityKey)}`,
            payload: {
              isCorrect,
              displayText: activityKey,
            },
          });
        }
      } finally {
        setIsSubmitting(false);
      }

      store.advanceWord();
      // Read fresh index from store after advance
      const freshState = useLessonStore.getState();
      const nextWord = freshState.currentSession?.wordData[freshState.currentWordIndex] ?? null;
      store.setCurrentWord(nextWord);
      setFeedbackResult(null);
      isAdvancingRef.current = false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduleId, activeProfile, currentWord],
  );

  // ─── Auto-advance when word hits max failed attempts ───────────────────────
  useEffect(() => {
    if (attemptCount >= MAX_WORD_ATTEMPTS && store.failedWords.includes(wordId) && feedbackResult) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceToNextWord(false);
      }, 2000);
      return () => {
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = null;
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptCount, wordId, feedbackResult]);

  // ─── Record + check pronunciation ─────────────────────────────────────────
  const handleRecordStop = useCallback(async () => {
    // Always read fresh word from the store to avoid stale-closure issues.
    const freshWord = useLessonStore.getState().currentWord;
    if (!freshWord) return;
    if (__DEV__) {
      console.log('[Lesson] currentWord:', JSON.stringify(freshWord));
    }
    const result = await pronunciation.stopAndCheck(
      freshWord.display_text,
      freshWord.target_ipa ?? '',
      // C5 — pass validation hints so server uses Gemini Two-Sided judge instead of
      // Azure-only force-align (which scores poorly / returns 0% without confused[]).
      freshWord.validation as { confused: string[]; feedback: Record<string, string> } | undefined,
    );
    if (!result) return;

    // C5 — errorType branch: infrastructure/service failures must not count as wrong attempts.
    // The hook sets pronunciation.error and returns null for errorType verdicts, so this
    // branch is a defense-in-depth safety net should that behavior ever change.
    if (result.errorType) {
      return;
    }

    const freshWordId = freshWord.id;
    const passed = result.overallIsCorrect || result.similarity >= PASSING_THRESHOLD;
    store.recordAttempt(freshWordId, passed, result);
    setFeedbackResult(result);

    if (passed) {
      haptics.successHaptic();
    } else {
      haptics.warningHaptic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = useCallback(() => {
    setFeedbackResult(null);
  }, []);

  const handleNextWord = useCallback(() => {
    const isPassing =
      (feedbackResult?.overallIsCorrect ?? false) ||
      (feedbackResult?.similarity ?? 0) >= PASSING_THRESHOLD;
    advanceToNextWord(isPassing);
  }, [feedbackResult, advanceToNextWord]);

  const handleRecordStart = useCallback(async () => {
    audio.stop();
    await pronunciation.startRecording();
  }, [audio, pronunciation]);

  const handleSkip = useCallback(() => {
    store.markWordFailed(wordId);
    advanceToNextWord(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordId, advanceToNextWord]);

  // ─── Loading / error / empty states ───────────────────────────────────────
  if (store.isLoading) {
    return (
      <View testID="lesson-loading" style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3A5F" />
      </View>
    );
  }

  if (store.error) {
    return (
      <View testID="lesson-error-container" style={styles.centered}>
        <Text testID="lesson-error-text" style={styles.errorText}>
          {store.error}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            testID="lesson-retry-button"
            style={styles.button}
            onPress={() => {
              store.setError(null);
              hasLoadedRef.current = false;
              loadModule();
            }}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
          <Pressable
            testID="lesson-go-home-button-error"
            style={styles.button}
            onPress={() => router.push('/')}
          >
            <Text style={styles.buttonText}>Go Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!activeProfile || !store.currentSession || !currentWord) {
    return (
      <View testID="lesson-empty-container" style={styles.centered}>
        <Text style={styles.placeholderText}>Start a lesson by tapping your NFC card</Text>
        <Pressable
          testID="lesson-go-home-button"
          style={styles.button}
          onPress={() => router.push('/')}
        >
          <Text style={styles.buttonText}>← Go Home</Text>
        </Pressable>
      </View>
    );
  }

  const progress = ((store.currentWordIndex + 1) / store.currentSession.totalWords) * 100;
  const feedbackIsPassing =
    (feedbackResult?.overallIsCorrect ?? false) ||
    (feedbackResult?.similarity ?? 0) >= PASSING_THRESHOLD;
  const isInteractionDisabled = pronunciation.isChecking || isSubmitting || !!feedbackResult;

  return (
    <SafeAreaView testID="lesson-screen" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          testID="lesson-back-button"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text testID="lesson-module-name" style={styles.moduleName} numberOfLines={1}>
          {store.currentSession.moduleName}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <Text testID="lesson-progress-label" style={styles.progressLabel}>
          Word {store.currentWordIndex + 1} of {store.currentSession.totalWords}
        </Text>
        <View testID="lesson-progress-bar-container" style={styles.progressBarContainer}>
          <View
            testID="lesson-progress-bar-fill"
            style={[styles.progressBarFill, { width: `${progress}%` }]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Word */}
        <View style={styles.wordSection}>
          <WordDisplay word={currentWord} isActive />
        </View>

        {/* Attempt counter */}
        <Text testID="lesson-attempt-counter" style={styles.attemptText}>
          Attempt {Math.min(attemptCount + 1, MAX_WORD_ATTEMPTS)} of {MAX_WORD_ATTEMPTS}
        </Text>

        {/* Pronunciation feedback panel */}
        {feedbackResult ? (
          <PronunciationFeedback
            result={feedbackResult}
            onRetry={handleRetry}
            onNextWord={handleNextWord}
            isPassing={feedbackIsPassing}
            attemptsRemaining={attemptsRemaining}
          />
        ) : null}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actionsSection}>
        <Pressable
          testID="lesson-play-button"
          style={[
            styles.actionButton,
            (audio.isLoading || !currentWord.audio_path) && styles.disabledButton,
          ]}
          disabled={audio.isLoading || !currentWord.audio_path}
          onPress={() => {
            console.log('[Audio] play button pressed, audio_path:', currentWord.audio_path);
            audio.play(currentWord.audio_path ?? '');
          }}
        >
          <Text style={styles.actionButtonText}>
            {audio.isLoading ? '⏳' : audio.audioError ? '⚠️' : '🔊'} Play
          </Text>
        </Pressable>

        <Pressable
          testID="lesson-record-button"
          style={[
            styles.actionButton,
            styles.recordButton,
            isInteractionDisabled && styles.disabledButton,
          ]}
          disabled={isInteractionDisabled}
          onPressIn={handleRecordStart}
          onPressOut={handleRecordStop}
        >
          <Text style={styles.actionButtonText}>
            {pronunciation.isChecking
              ? 'Checking…'
              : pronunciation.isRecording
                ? '🔴 Recording'
                : '🎙️ Hold to Record'}
          </Text>
        </Pressable>
      </View>

      {/* Audio error — shown inline under action buttons */}
      {audio.audioError ? (
        <Text testID="lesson-audio-error" style={styles.audioErrorText}>
          {audio.audioError}
        </Text>
      ) : null}

      {/* Pronunciation hook error — shown when stopAndCheck guard fires or API fails */}
      {pronunciation.error && !feedbackResult ? (
        <Text testID="lesson-pronunciation-error" style={styles.pronunciationErrorText}>
          {pronunciation.error}
        </Text>
      ) : null}

      {/* Skip button — hidden while feedback is showing or checking */}
      {!feedbackResult && !pronunciation.isChecking ? (
        <Pressable testID="lesson-skip-button" style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip word ⏭️</Text>
        </Pressable>
      ) : null}

      {pronunciation.canSkipPronunciation && !feedbackResult && !pronunciation.isChecking ? (
        <Pressable
          testID="lesson-skip-pronunciation-button"
          style={styles.skipPronunciationButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipPronunciationText}>
            Pronunciation unavailable — Skip to next word
          </Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#1F3A5F',
  },
  moduleName: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Lexend_700Bold',
    color: '#1F3A5F',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: '#2B2D42',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9F1C',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  wordSection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  attemptText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1F3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    backgroundColor: '#E71D36',
  },
  disabledButton: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: 'Lexend_700Bold',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingBottom: 24,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: '#6B7280',
  },
  skipPronunciationButton: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 16,
  },
  skipPronunciationText: {
    fontSize: 13,
    fontFamily: 'Lexend_400Regular',
    color: '#92400E',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: '#E71D36',
    textAlign: 'center',
    marginBottom: 20,
  },
  audioErrorText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: '#E71D36',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  pronunciationErrorText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: '#E71D36',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: 'Lexend_400Regular',
    color: '#2B2D42',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#1F3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Lexend_700Bold',
    color: '#FFFFFF',
  },
});
