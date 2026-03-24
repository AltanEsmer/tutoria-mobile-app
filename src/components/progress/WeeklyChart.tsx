import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ActivityProgress } from '@/utils/types';

interface WeeklyChartProps {
  activities: ActivityProgress[];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_BAR_HEIGHT = 80;
const MIN_BAR_HEIGHT = 4;

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function WeeklyChart({ activities }: WeeklyChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { date: d, key: toDateKey(d), label: DAY_LABELS[d.getDay()], count: 0 };
    });

    const keyToIndex: Record<string, number> = {};
    days.forEach((day, i) => {
      keyToIndex[day.key] = i;
    });

    for (const activity of activities) {
      if (!activity.lastDate) continue;
      const dateKey = activity.lastDate.split('T')[0];
      if (dateKey in keyToIndex) {
        days[keyToIndex[dateKey]].count += 1;
      }
    }

    const maxCount = Math.max(...days.map((d) => d.count), 1);
    const todayKey = toDateKey(today);

    return days.map((day) => ({
      ...day,
      isToday: day.key === todayKey,
      barHeight: Math.max(MIN_BAR_HEIGHT, (day.count / maxCount) * MAX_BAR_HEIGHT),
    }));
  }, [activities]);

  return (
    <View style={styles.container}>
      {chartData.map((day) => (
        <View key={day.key} style={styles.column}>
          <View style={styles.barWrapper}>
            <View style={[styles.bar, { height: day.barHeight }, day.isToday && styles.barToday]} />
          </View>
          <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barWrapper: {
    height: MAX_BAR_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 20,
    backgroundColor: '#FF9F1C',
    borderRadius: 4,
  },
  barToday: {
    borderWidth: 2,
    borderColor: '#1F3A5F',
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: 'Lexend_400Regular',
    color: '#9CA3AF',
  },
  dayLabelToday: {
    fontFamily: 'Lexend_700Bold',
    color: '#1F3A5F',
  },
});
