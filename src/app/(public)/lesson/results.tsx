import React, { useEffect, useRef } from 'react';
import { Animated, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useLessonStore } from '@/stores/useLessonStore';
import type { WordData } from '@/utils/types';

// ─── Confetti ────────────────────────────────────────────────────

const CONFETTI_EMOJIS = ['🎉', '✨', '⭐', '🎊', '💫'];
const CONFETTI_COUNT = 15;

interface ConfettiItem {
  id: number;
  emoji: string;
  x: number;
  anim: Animated.Value;
  delay: number;
}

function buildConfetti(): ConfettiItem[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
    x: Math.random() * 90 + 2, // 2–92% from left
    anim: new Animated.Value(0),
    delay: Math.random() * 1200,
  }));
}

function ConfettiLayer() {
  const items = useRef<ConfettiItem[]>(buildConfetti()).current;

  useEffect(() => {
    const animations = items.map((item) =>
      Animated.loop(
        Animated.timing(item.anim, {
          toValue: 1,
          duration: 2000 + Math.random() * 1000,
          delay: item.delay,
          useNativeDriver: true,
        }),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [items]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map((item) => {
        const translateY = item.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, 780],
        });
        const opacity = item.anim.interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        return (
          <Animated.Text
            key={item.id}
            style={[
              styles.confettiEmoji,
              { left: `${item.x}%` as unknown as number, transform: [{ translateY }], opacity },
            ]}
          >
            {item.emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ─── Word row ────────────────────────────────────────────────────

interface WordRowProps {
  word: WordData;
  passed: boolean;
  failed: boolean;
  similarity?: number;
}

function WordRow({ word, passed, failed, similarity }: WordRowProps) {
  const statusIcon = passed ? '✅' : failed ? '❌' : '⏭️';
  const scoreLabel = similarity !== undefined ? `${Math.round(similarity)}%` : '–';

  return (
    <View style={styles.wordRow}>
      <Text style={styles.wordRowIcon}>{statusIcon}</Text>
      <Text style={styles.wordRowText} numberOfLines={1}>
        {word.display_text}
      </Text>
      <View
        style={[
          styles.scorePill,
          passed ? styles.scorePillPass : failed ? styles.scorePillFail : styles.scorePillNeutral,
        ]}
      >
        <Text style={styles.scorePillText}>{scoreLabel}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────

export default function ResultsScreen() {
  const router = useRouter();
  const { moduleId } = useLocalSearchParams<{ moduleId?: string }>();

  const {
    currentSession,
    completedWords,
    failedWords,
    pronunciationResults,
    sessionScore,
    resetSession,
    isModuleOnCooldown,
  } = useLessonStore();

  // Snapshot session data on mount so it survives resetSession
  const sessionRef = useRef(currentSession);
  const completedRef = useRef(completedWords);
  const failedRef = useRef(failedWords);
  const resultsRef = useRef(pronunciationResults);
  const scoreRef = useRef(sessionScore);

  useEffect(() => {
    // If no session on mount, redirect home
    if (!sessionRef.current) {
      router.replace('/(public)/(tabs)/home');
    }

    return () => {
      resetSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session = sessionRef.current;

  if (!session) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyText}>No session data found.</Text>
        <Pressable style={styles.btn} onPress={() => router.replace('/(public)/(tabs)/home')}>
          <Text style={styles.btnText}>Back to Home 🏠</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const total = session.totalWords || session.wordData.length;
  const score = scoreRef.current;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  const encouragement =
    pct >= 80 ? 'Amazing! 🌟' : pct >= 50 ? 'Good effort! 💪' : 'Keep practicing! 📚';

  const onCooldown = moduleId ? isModuleOnCooldown(moduleId) : false;

  const handleHome = () => {
    router.replace('/(public)/(tabs)/home');
  };

  const handleTryAgain = () => {
    if (moduleId) {
      router.replace(`/(public)/lesson/${moduleId}` as never);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Confetti when score is good */}
      {pct >= 80 && <ConfettiLayer />}

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.moduleName} numberOfLines={2}>
          {session.moduleName}
        </Text>
        <Text style={styles.encouragement}>{encouragement}</Text>

        <View style={styles.scoreCircle}>
          <Text style={styles.scoreNumber}>{pct}%</Text>
          <Text style={styles.scoreSubLabel}>
            {score} / {total} words
          </Text>
        </View>
      </View>

      {/* ── Word breakdown ── */}
      <FlatList<WordData>
        data={session.wordData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Text style={styles.listTitle}>Word breakdown</Text>}
        renderItem={({ item }) => (
          <WordRow
            word={item}
            passed={completedRef.current.includes(item.id)}
            failed={failedRef.current.includes(item.id)}
            similarity={resultsRef.current[item.id]?.similarity}
          />
        )}
        ListFooterComponent={<View style={styles.listFooter} />}
      />

      {/* ── Buttons ── */}
      <View style={styles.actions}>
        {moduleId &&
          (onCooldown ? (
            <View style={[styles.btn, styles.btnDisabled]}>
              <Text style={styles.btnText}>⏳ On Cooldown</Text>
            </View>
          ) : (
            <Pressable style={[styles.btn, styles.btnAccent]} onPress={handleTryAgain}>
              <Text style={styles.btnText}>Try Again 🔄</Text>
            </Pressable>
          ))}
        <Pressable style={styles.btn} onPress={handleHome}>
          <Text style={styles.btnText}>Back to Home 🏠</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },
  centered: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  emptyText: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 16,
    color: '#2B2D42',
    textAlign: 'center',
  },

  // ── Confetti
  confettiEmoji: {
    position: 'absolute',
    fontSize: 22,
    top: 0,
  },

  // ── Header
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  moduleName: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 20,
    color: '#1F3A5F',
    textAlign: 'center',
    marginBottom: 8,
  },
  encouragement: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 16,
    color: '#2B2D42',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1F3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 32,
    color: '#FFFFFF',
  },
  scoreSubLabel: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: '#C9D4E3',
    marginTop: 2,
  },

  // ── Word list
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listFooter: {
    height: 24,
  },
  listTitle: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 16,
    color: '#1F3A5F',
    marginBottom: 12,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  wordRowIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  wordRowText: {
    flex: 1,
    fontFamily: 'Lexend_400Regular',
    fontSize: 15,
    color: '#2B2D42',
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginLeft: 8,
  },
  scorePillPass: {
    backgroundColor: '#E6F4EA',
  },
  scorePillFail: {
    backgroundColor: '#FDECEA',
  },
  scorePillNeutral: {
    backgroundColor: '#F3F4F6',
  },
  scorePillText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 13,
    color: '#1F3A5F',
  },

  // ── Buttons
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  btn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1F3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAccent: {
    backgroundColor: '#FF9F1C',
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  btnText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
