import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAudio } from '@/hooks/useAudio';
import { useHaptics } from '@/hooks/useHaptics';
import { usePronunciation } from '@/hooks/usePronunciation';
import { completeWord, startOrResumeModule } from '@/services/api';
import { useLessonStore } from '@/stores/useLessonStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { PronunciationFeedback } from '@/components/lesson/PronunciationFeedback';
import { WordDisplay } from '@/components/lesson/WordDisplay';
import type { PronunciationCheckResponse } from '@/utils/types';

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
      store.setSession(session);
      const startWord = session.wordData[session.position] ?? session.wordData[0] ?? null;
      store.setCurrentWord(startWord);
      if (startWord?.audio_path) {
        audio.setAudioPath(startWord.audio_path);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load lesson';
      store.setError(message);
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

      setIsSubmitting(true);
      try {
        await completeWord(moduleId, {
          profileId: activeProfile.id,
          wordId: currentWord.id,
          isCorrect,
        });
      } catch {
        // API failure is non-blocking — local state still advances
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
    if (!currentWord) return;
    const result = await pronunciation.stopAndCheck(
      currentWord.display_text,
      currentWord.target_ipa ?? '',
    );
    if (!result) return;

    const passed = result.overallIsCorrect || result.similarity >= PASSING_THRESHOLD;
    store.recordAttempt(wordId, passed, result);
    setFeedbackResult(result);

    if (passed) {
      haptics.successHaptic();
    } else {
      haptics.warningHaptic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, wordId]);

  const handleRetry = useCallback(() => {
    setFeedbackResult(null);
  }, []);

  const handleNextWord = useCallback(() => {
    const isPassing =
      (feedbackResult?.overallIsCorrect ?? false) ||
      (feedbackResult?.similarity ?? 0) >= PASSING_THRESHOLD;
    advanceToNextWord(isPassing);
  }, [feedbackResult, advanceToNextWord]);

  const handleSkip = useCallback(() => {
    store.markWordFailed(wordId);
    advanceToNextWord(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordId, advanceToNextWord]);

  // ─── Loading / error / empty states ───────────────────────────────────────
  if (store.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3A5F" />
      </View>
    );
  }

  if (store.error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{store.error}</Text>
        <Pressable
          style={styles.button}
          onPress={() => {
            store.setError(null);
            hasLoadedRef.current = false;
            loadModule();
          }}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!activeProfile || !store.currentSession || !currentWord) {
    return (
      <View style={styles.centered}>
        <Text style={styles.placeholderText}>Start a lesson by tapping your NFC card</Text>
        <Pressable style={styles.button} onPress={() => router.push('/')}>
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.moduleName} numberOfLines={1}>
          {store.currentSession.moduleName}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          Word {store.currentWordIndex + 1} of {store.currentSession.totalWords}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
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
        <Text style={styles.attemptText}>
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
          style={[
            styles.actionButton,
            (audio.isLoading || !currentWord.audio_path) && styles.disabledButton,
          ]}
          disabled={audio.isLoading || !currentWord.audio_path}
          onPress={() => audio.play(currentWord.audio_path ?? '')}
        >
          <Text style={styles.actionButtonText}>{audio.isLoading ? '⏳' : '🔊'} Play</Text>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            styles.recordButton,
            isInteractionDisabled && styles.disabledButton,
          ]}
          disabled={isInteractionDisabled}
          onPressIn={pronunciation.startRecording}
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

      {/* Skip button — hidden while feedback is showing or checking */}
      {!feedbackResult && !pronunciation.isChecking ? (
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip word ⏭️</Text>
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
  errorText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: '#E71D36',
    textAlign: 'center',
    marginBottom: 20,
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
