import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { PronunciationCheckResponse } from '@/utils/types';
import { ScoreBadge } from './ScoreBadge';

interface PronunciationFeedbackProps {
  result: PronunciationCheckResponse | null;
  onRetry: () => void;
  onNextWord: () => void;
  isPassing: boolean;
  attemptsRemaining: number;
}

function getEncouragementMessage(isPassing: boolean, attemptsRemaining: number): string {
  if (isPassing) {
    return Math.random() > 0.5 ? 'Great job! 🌟' : 'Well done! 👏';
  }
  if (attemptsRemaining > 0) return 'Almost there! Try again 💪';
  return "Let's move on to the next word 📚";
}

export function PronunciationFeedback({
  result,
  onRetry,
  onNextWord,
  isPassing,
  attemptsRemaining,
}: PronunciationFeedbackProps) {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(30));

  useEffect(() => {
    if (result) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }
    return () => {
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, [result, fadeAnim, slideAnim]);

  if (!result) return null;

  const encouragement = getEncouragementMessage(isPassing, attemptsRemaining);
  const showRetry = !isPassing && attemptsRemaining > 0;

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <Text style={styles.encouragement}>{encouragement}</Text>

      <ScoreBadge score={result.similarity} size={100} />

      {result.feedback ? <Text style={styles.feedback}>{result.feedback}</Text> : null}

      {result.errorType ? (
        <View style={styles.errorChip}>
          <Text style={styles.errorChipText}>{result.errorType}</Text>
        </View>
      ) : null}

      <Text style={styles.attempts}>
        {attemptsRemaining > 0
          ? `${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining`
          : 'No attempts remaining'}
      </Text>

      <View style={styles.buttonRow}>
        {showRetry ? (
          <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={onRetry}>
            <Text style={styles.buttonText}>Try Again 🔄</Text>
          </TouchableOpacity>
        ) : null}
        {!showRetry ? (
          <TouchableOpacity style={[styles.button, styles.nextButton]} onPress={onNextWord}>
            <Text style={styles.buttonText}>Next Word ➡️</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  encouragement: {
    fontSize: 22,
    fontFamily: 'Lexend_700Bold',
    color: '#2B2D42',
    textAlign: 'center',
  },
  feedback: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: '#1F3A5F',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  errorChip: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  errorChipText: {
    fontSize: 13,
    fontFamily: 'Lexend_400Regular',
    color: '#E65100',
    textTransform: 'capitalize',
  },
  attempts: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: '#6B7280',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: '#1F3A5F',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Lexend_700Bold',
    color: '#FFFFFF',
  },
});
