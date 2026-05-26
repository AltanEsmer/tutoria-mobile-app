import { useFocusEffect, useIsFocused } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityList } from '@/components/progress/ActivityList';
import { StreakBadge } from '@/components/progress/StreakBadge';
import { WeeklyChart } from '@/components/progress/WeeklyChart';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { getProgress } from '@/services/api';
import { useProfileStore } from '@/stores/useProfileStore';
import { useProgressStore } from '@/stores/useProgressStore';

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
  const lastInvalidatedAt = useProgressStore((s) => s.lastInvalidatedAt);

  const [error, setError] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic id used to ignore results from a fetch that was superseded or
  // invalidated (e.g. the screen blurred mid-request). Bumped on each fetch
  // and on focus-effect teardown so stale responses can't set state.
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!activeProfile) return;
    const fetchId = ++fetchIdRef.current;
    console.log('[Progress] fetching data…');
    setLoading(true);
    setError(null);
    try {
      const data = await getProgress(activeProfile.id);
      if (fetchId !== fetchIdRef.current) return;
      console.log('[Progress] received activities:', data.activities.length);
      setActivities(data.activities);
      setStreakDays(data.streakDays);
    } catch {
      if (fetchId !== fetchIdRef.current) return;
      setError('Failed to load progress. Please try again.');
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [activeProfile, setActivities, setLoading, setStreakDays]);

  // Deduplicate rapid fetch triggers (useFocusEffect + useEffect([lastInvalidatedAt]) can both
  // fire within the same render cycle when navigating back from a lesson).
  const debouncedFetch = useCallback(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => fetchData(), 50);
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      console.log('[Progress] focus effect fired, fetching…');
      debouncedFetch();
      return () => {
        // Invalidate any in-flight fetch and cancel a pending debounced call so
        // they can't set state after the screen has blurred/unmounted.
        fetchIdRef.current++;
        if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      };
    }, [debouncedFetch]),
  );

  useEffect(() => {
    if (lastInvalidatedAt > 0 && isFocused && activeProfile) {
      debouncedFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastInvalidatedAt]);

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
          <Pressable
            testID="progress-retry-button"
            style={styles.retryButton}
            onPress={() => debouncedFetch()}
          >
            <Text style={styles.retryButtonText}>Try Again 🔄</Text>
          </Pressable>
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
  retryButton: {
    marginTop: 20,
    height: 48,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: '#FF9F1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
