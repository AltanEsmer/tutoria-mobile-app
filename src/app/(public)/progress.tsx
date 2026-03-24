import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { getProgress } from '@/services/api';
import { useProgressStore } from '@/stores/useProgressStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { StreakBadge } from '@/components/progress/StreakBadge';
import { WeeklyChart } from '@/components/progress/WeeklyChart';
import { ActivityList } from '@/components/progress/ActivityList';

export default function ProgressScreen() {
  const activeProfile = useProfileStore((s) => s.activeProfile);
  const activities = useProgressStore((s) => s.activities);
  const streakDays = useProgressStore((s) => s.streakDays);
  const isLoading = useProgressStore((s) => s.isLoading);
  const setActivities = useProgressStore((s) => s.setActivities);
  const setStreakDays = useProgressStore((s) => s.setStreakDays);
  const setLoading = useProgressStore((s) => s.setLoading);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile) return;

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProgress(activeProfile.id);
        if (!cancelled) {
          setActivities(data.activities);
          setStreakDays(data.streakDays);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load progress. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

  if (!activeProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyStateText}>Select a profile to see progress</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF9F1C" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your Progress</Text>

        <StreakBadge streakDays={streakDays} />

        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        <WeeklyChart activities={activities} />

        <Text style={styles.sectionTitle}>Words Practiced</Text>
        <ActivityList activities={activities} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Lexend_700Bold',
    color: '#1F3A5F',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Lexend_700Bold',
    color: '#1F3A5F',
    marginTop: 28,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: '#E71D36',
    textAlign: 'center',
  },
});
