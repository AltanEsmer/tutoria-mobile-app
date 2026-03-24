import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StreakBadgeProps {
  streakDays: number;
}

export function StreakBadge({ streakDays }: StreakBadgeProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.flame}>🔥</Text>
      <Text style={styles.count}>{streakDays}</Text>
      <Text style={styles.label}>day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  flame: {
    fontSize: 48,
    marginBottom: 4,
  },
  count: {
    fontSize: 48,
    fontFamily: 'Lexend_700Bold',
    color: '#FF9F1C',
    lineHeight: 56,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: '#2B2D42',
    marginTop: 4,
  },
});
