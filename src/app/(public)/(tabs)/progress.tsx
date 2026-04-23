import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getProgress } from '@/services/api';
import { useProgressStore } from '@/stores/useProgressStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { StreakBadge } from '@/components/progress/StreakBadge';
import { WeeklyChart } from '@/components/progress/WeeklyChart';
import { ActivityList } from '@/components/progress/ActivityList';

export default function ProgressScreen() {
  return (
    <ErrorBoundary>
      <ProgressScreenContent />
    </ErrorBoundary>
  );
}

function ProgressScreenContent() {
  const activeProfile = useProfileStore((s) => s.activeProfile);
  const activities = useProgressStore((s) => s.activities);
  const streakDays = useProgressStore((s) => s.streakDays);
  const isLoading = useProgressStore((s) => s.isLoading);
  const setActivities = useProgressStore((s) => s.setActivities);
  const setStreakDays = useProgressStore((s) => s.setStreakDays);
  const setLoading = useProgressStore((s) => s.setLoading);

  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!activeProfile) return;

      let cancelled = false;

      const fetchData = async () => {
        console.log('[Progress] focus effect fired, fetching…');
        setLoading(true);
        setError(null);
        try {
          const data = await getProgress(activeProfile.id);
          if (!cancelled) {
            console.log('[Progress] received activities:', data.activities.length);
            setActivities(data.activities);
            setStreakDays(data.streakDays);
          }
        } catch {
          if (!cancelled) {
            setError('Failed to load progress. Please try again.');
          }
        } finally {
          // Always reset loading — even when cancelled — so isLoading never gets stuck true.
          setLoading(false);
        }
      };

      fetchData();

      return () => {
        cancelled = true;
      };
    }, [activeProfile, setActivities, setLoading, setStreakDays]),
  );

  if (!activeProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View testID="progress-no-profile-container" style={styles.centered}>
          <Text testID="progress-no-profile-text" style={styles.emptyStateText}>
            Select a profile to see progress
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View testID="progress-loading-container" style={styles.centered}>
          <ActivityIndicator size="large" color="#FF9F1C" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View testID="progress-error-container" style={styles.centered}>
          <Text testID="progress-error-text" style={styles.errorText}>
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID="progress-screen" style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text testID="progress-title" style={styles.title}>
          Your Progress
        </Text>

        <StreakBadge streakDays={streakDays} />

        <Text testID="progress-weekly-title" style={styles.sectionTitle}>
          Weekly Activity
        </Text>
        <WeeklyChart activities={activities} />

        <Text testID="progress-words-title" style={styles.sectionTitle}>
          Words Practiced
        </Text>
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
