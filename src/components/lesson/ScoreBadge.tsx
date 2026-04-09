import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ScoreBadgeProps {
  score: number;
  size?: number;
}

function getBadgeColor(score: number): string {
  if (score >= 80) return '#4CAF50';
  if (score >= 50) return '#FF9800';
  return '#F44336';
}

export function ScoreBadge({ score, size = 80 }: ScoreBadgeProps) {
  const color = getBadgeColor(score);
  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  };

  return (
    <View style={[styles.circle, circleStyle]}>
      <Text style={[styles.scoreText, { fontSize: size * 0.28 }]}>{Math.round(score)}%</Text>
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
