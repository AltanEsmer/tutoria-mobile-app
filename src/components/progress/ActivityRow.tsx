import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ActivityProgress } from '@/utils/types';

interface ActivityRowProps {
  activity: ActivityProgress;
}

const MAX_DOTS = 3;

export function ActivityRow({ activity }: ActivityRowProps) {
  const filledDots = Math.min(activity.daysCorrect, MAX_DOTS);

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.word}>{activity.displayText}</Text>
        <View style={styles.dotsRow}>
          {Array.from({ length: MAX_DOTS }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < filledDots ? styles.dotFilled : styles.dotEmpty]}
            />
          ))}
        </View>
        {activity.lastDate ? (
          <Text style={styles.dateLabel}>{formatDate(activity.lastDate)}</Text>
        ) : null}
      </View>
      {activity.mastered ? (
        <View style={styles.masteredBadge}>
          <Text style={styles.masteredText}>Mastered ✅</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  left: {
    flex: 1,
    gap: 6,
  },
  word: {
    fontSize: 18,
    fontFamily: 'Lexend_700Bold',
    color: '#2B2D42',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotFilled: {
    backgroundColor: '#FF9F1C',
  },
  dotEmpty: {
    backgroundColor: '#E5E7EB',
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: 'Lexend_400Regular',
    color: '#9CA3AF',
  },
  masteredBadge: {
    backgroundColor: '#2EC4B6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  masteredText: {
    fontSize: 12,
    fontFamily: 'Lexend_700Bold',
    color: '#FFFFFF',
  },
});
