import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAudio } from '@/hooks/useAudio';
import { usePronunciation } from '@/hooks/usePronunciation';
import { startOrResumeModule } from '@/services/api';
import { useLessonStore } from '@/stores/useLessonStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { WordDisplay } from '@/components/lesson/WordDisplay';

export default function LessonScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const router = useRouter();

  const {
    currentSession,
    currentWord,
    isLoading,
    error,
    setSession,
    setCurrentWord,
    setLoading,
    setError,
    reset,
  } = useLessonStore();
  const { activeProfile } = useProfileStore();
  const audio = useAudio();
  const { isChecking, startRecording, stopAndCheck } = usePronunciation();

  const loadModule = useCallback(async () => {
    if (!activeProfile || !moduleId) return;
    setLoading(true);
    try {
      const session = await startOrResumeModule(moduleId, activeProfile.id);
      setSession(session);
      setCurrentWord(session.wordData[session.position] ?? session.wordData[0] ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load lesson';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [moduleId, activeProfile, setLoading, setSession, setCurrentWord, setError]);

  useEffect(() => {
    if (activeProfile && !currentSession) {
      loadModule();
    }
    return () => {
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3A5F" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.button}
          onPress={() => {
            setError(null);
            loadModule();
          }}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!activeProfile || !currentSession || !currentWord) {
    return (
      <View style={styles.centered}>
        <Text style={styles.placeholderText}>Start a lesson by tapping your NFC card</Text>
        <Pressable style={styles.button} onPress={() => router.push('/')}>
          <Text style={styles.buttonText}>← Go Home</Text>
        </Pressable>
      </View>
    );
  }

  const progress = ((currentSession.position + 1) / currentSession.totalWords) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.moduleName} numberOfLines={1}>
          {currentSession.moduleName}
        </Text>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          Word {currentSession.position + 1} of {currentSession.totalWords}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <View style={styles.wordSection}>
        <WordDisplay word={currentWord} isActive />
      </View>

      <View style={styles.actionsSection}>
        <Pressable
          style={[styles.actionButton, !currentWord.audio_path && styles.disabledButton]}
          disabled={!currentWord.audio_path}
          onPress={() => audio.play(currentWord.audio_path ?? '')}
        >
          <Text style={styles.actionButtonText}>🔊 Play</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.recordButton, isChecking && styles.disabledButton]}
          disabled={isChecking}
          onPressIn={startRecording}
          onPressOut={() => stopAndCheck(currentWord.display_text, currentWord.target_ipa ?? '')}
        >
          <Text style={styles.actionButtonText}>{isChecking ? 'Checking…' : '🎙️ Record'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    paddingTop: 56,
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
    marginBottom: 24,
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
    marginBottom: 32,
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
  wordSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 40,
    paddingTop: 24,
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
    fontSize: 16,
    fontFamily: 'Lexend_700Bold',
    color: '#FFFFFF',
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
