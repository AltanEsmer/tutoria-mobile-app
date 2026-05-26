import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ScoreBadgeProps {
  score: number;
  size?: number;
  /**
   * When provided, color is driven by the pass/fail decision rather than the
   * numeric score. This avoids the failure mode where a high `similarity`
   * value (which can reflect the Two-Sided judge's transcription confidence,
   * not target match) paints a wrong-word attempt green. Pass the value
   * computed by `isPronunciationPassing(result)` from the call site.
   */
  isPassing?: boolean;
}

function isPass(score: number, isPassing?: boolean): boolean {
  if (isPassing !== undefined) return isPassing;
  return score >= 80;
}

export function ScoreBadge({ score, size = 80, isPassing }: ScoreBadgeProps) {
  const passed = isPass(score, isPassing);
  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: passed ? '#4CAF50' : '#F44336',
  };

  return (
    <View style={[styles.circle, circleStyle]}>
      <Text style={[styles.scoreText, { fontSize: size * 0.5 }]}>{passed ? '✓' : '✗'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scoreText: {
    fontFamily: 'Lexend_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
