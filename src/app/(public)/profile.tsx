import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { listProfiles, selectProfile } from '@/services/api';
import { useProfileStore } from '@/stores/useProfileStore';
import type { Profile } from '@/utils/types';

const COLORS = {
  navy: '#1F3A5F',
  orange: '#FF9F1C',
  cream: '#FDFBF7',
  charcoal: '#2B2D42',
  mint: '#2EC4B6',
  coral: '#E71D36',
  white: '#FFFFFF',
  gray: '#9CA3AF',
  lightGray: '#E5E7EB',
};

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

interface ProfileCardProps {
  profile: Profile;
  isActive: boolean;
  showFeedback: boolean;
  onPress: () => void;
}

function ProfileCard({ profile, isActive, showFeedback, onPress }: ProfileCardProps) {
  return (
    <Pressable
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Select profile ${profile.name}`}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitial(profile.name)}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.profileName}>{profile.name}</Text>
        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>
      {showFeedback && <Text style={styles.feedbackText}>Selected!</Text>}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profiles, activeProfile, setProfiles, setActiveProfile } = useProfileStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await listProfiles();
        if (!cancelled) setProfiles(data);
      } catch {
        if (!cancelled) setError('Failed to load profiles. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setProfiles]);

  async function handleSelectProfile(profile: Profile) {
    try {
      await selectProfile(profile.id);
      setActiveProfile(profile);
      setFeedbackId(profile.id);
      setTimeout(() => setFeedbackId(null), 1500);
    } catch {
      // selection feedback is best-effort
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.navy} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profiles</Text>
      </View>

      {profiles.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No profiles yet</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/(public)/profile/add')}
            accessibilityRole="button"
          >
            <Text style={styles.addButtonText}>Add your first profile</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={profiles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ProfileCard
                profile={item}
                isActive={activeProfile?.id === item.id}
                showFeedback={feedbackId === item.id}
                onPress={() => handleSelectProfile(item)}
              />
            )}
          />
          <View style={styles.footer}>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push('/(public)/profile/add')}
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>+ Add Profile</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 24,
    color: COLORS.navy,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: COLORS.charcoal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: COLORS.orange,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 20,
    color: COLORS.white,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileName: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 16,
    color: COLORS.charcoal,
  },
  activeBadge: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeBadgeText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 12,
    color: COLORS.white,
  },
  feedbackText: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: COLORS.mint,
  },
  emptyText: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 16,
    color: COLORS.coral,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 16,
    color: COLORS.white,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
});
