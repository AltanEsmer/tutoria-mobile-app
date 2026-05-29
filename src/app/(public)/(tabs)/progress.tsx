import { useFocusEffect, useIsFocused } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityList } from '@/components/progress/ActivityList';
import { StreakBadge } from '@/components/progress/StreakBadge';
import { WeeklyChart } from '@/components/progress/WeeklyChart';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { getProgress, getStats } from '@/services/api';
import { useProfileStore } from '@/stores/useProfileStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { computeStreak, deriveActivities } from '@/utils/progress';

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
  const mergeServerActivities = useProgressStore((s) => s.mergeServerActivities);
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
    const startedAt = Date.now();
    const profileId = activeProfile.id;
    console.log('[Progress] fetching data… profileId=', profileId);
    setLoading(true);
    setError(null);

    // Render from the on-device activity log when the backend can't serve progress.
    // Returns true if anything was shown; false when there is genuinely no local data.
    const renderFromLocal = async (serverStreak?: number): Promise<boolean> => {
      const log = useProgressStore.getState().activityLog[profileId] ?? {};
      const localActivities = deriveActivities(log);
      if (localActivities.length === 0) return false;
      setActivities(localActivities);
      // Prefer an authoritative streak: server progress value, else the working
      // /v1/stats endpoint (no broken activities join), else locally computed.
      let streak = typeof serverStreak === 'number' && serverStreak > 0 ? serverStreak : null;
      if (streak === null) {
        try {
          const stats = await getStats(profileId);
          if (fetchId === fetchIdRef.current && typeof stats?.streakDays === 'number') {
            streak = stats.streakDays;
          }
        } catch {
          // /v1/stats unavailable — fall back to the locally-computed streak below.
        }
      }
      if (fetchId !== fetchIdRef.current) return true;
      setStreakDays(streak ?? computeStreak(log, new Date()));
      setError(null);
      console.log('[Progress] rendered from local activity log:', localActivities.length, 'words');
      return true;
    };

    try {
      const data = await getProgress(profileId);
      if (fetchId !== fetchIdRef.current) return;
      const serverActivities = data.activities ?? [];
      if (serverActivities.length > 0) {
        // Healthy backend path — server is authoritative; seed the local log for offline use.
        console.log(
          '[Progress] received activities:',
          serverActivities.length,
          'streakDays:',
          data.streakDays,
          'in',
          Date.now() - startedAt,
          'ms',
        );
        setActivities(serverActivities);
        setStreakDays(data.streakDays ?? 0);
        mergeServerActivities(profileId, serverActivities);
        return;
      }
      // 200 but no activities — show local history if we have any, else a legitimate empty state.
      console.log('[Progress] server returned no activities; trying local fallback');
      const shown = await renderFromLocal(data.streakDays);
      if (!shown && fetchId === fetchIdRef.current) {
        setActivities([]);
        setStreakDays(data.streakDays ?? 0);
      }
    } catch (err: unknown) {
      if (fetchId !== fetchIdRef.current) return;
      // Surface the actual error so backend issues are diagnosable from Metro logs.
      // The axios response interceptor already logs `[API] <status> ...`, but the
      // network-failure / timeout branch only logs a vague line — we add detail here.
      const e = err as
        | { response?: { status?: number; data?: unknown }; message?: string; code?: string }
        | undefined;
      const status = e?.response?.status;
      const elapsedMs = Date.now() - startedAt;
      console.warn(
        '[Progress] fetch failed',
        JSON.stringify({
          status: status ?? null,
          code: e?.code ?? null,
          message: e?.message ?? 'unknown',
          elapsedMs,
          responseBody: e?.response?.data ?? null,
        }),
      );
      // Backend is down — fall back to on-device progress. Only show the error
      // screen when there's also nothing local to display.
      const shown = await renderFromLocal();
      if (!shown && fetchId === fetchIdRef.current) {
        setError('Failed to load progress. Please try again.');
      }
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [activeProfile, setActivities, setLoading, setStreakDays, mergeServerActivities]);

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
