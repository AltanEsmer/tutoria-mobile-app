import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getMissions } from '@/services/api';
import { useProfileStore } from '@/stores/useProfileStore';
import { useLessonStore } from '@/stores/useLessonStore';
import { MissionCard } from '@/components/ui/MissionCard';
import { NfcPrompt } from '@/components/nfc/NfcPrompt';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Mission } from '@/utils/types';

export default function HomeScreen() {
  const activeProfile = useProfileStore((s) => s.activeProfile);
  const currentSession = useLessonStore((s) => s.currentSession);

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getMissions(activeProfile.id)
      .then((data) => {
        if (!cancelled) {
          const sorted = [...data].sort((a, b) => a.priority - b.priority);
          setMissions(sorted.slice(0, 3));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load missions. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile]);

  const greeting = getGreeting();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{greeting} 👋</Text>
          {activeProfile && <Text style={styles.subtitle}>{activeProfile.name}</Text>}
        </View>

        {/* No profile state */}
        {!activeProfile && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👤</Text>
            <Text style={styles.emptyTitle}>No profile selected</Text>
            <Text style={styles.emptyBody}>Select a profile to get started</Text>
            <Pressable
              style={styles.linkButton}
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
            >
              <Text style={styles.linkButtonText}>Go to Profiles</Text>
            </Pressable>
          </View>
        )}

        {/* Missions section */}
        {activeProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Missions</Text>

            {loading && <LoadingSpinner style={styles.spinner} />}

            {!loading && error && (
              <View style={styles.errorState}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!loading && !error && missions.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎉</Text>
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptyBody}>No missions available right now.</Text>
              </View>
            )}

            {!loading &&
              !error &&
              missions.map((mission) => (
                <MissionCard
                  key={mission.moduleId}
                  mission={mission}
                  onPress={() => router.push('/lesson/' + mission.moduleId)}
                />
              ))}
          </View>
        )}

        {/* NFC prompt when no active lesson */}
        {activeProfile && !currentSession && !loading && (
          <View style={styles.section}>
            <NfcPrompt />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 26,
    color: '#1F3A5F',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 15,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 18,
    color: '#2B2D42',
    marginBottom: 14,
  },
  spinner: {
    flex: 0,
    height: 80,
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: '#E71D36',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 18,
    color: '#2B2D42',
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1F3A5F',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButtonText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
