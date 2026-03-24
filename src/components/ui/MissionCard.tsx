import { StyleSheet, Text, View } from 'react-native';
import type { Mission } from '@/utils/types';
import { Button } from './Button';

interface MissionCardProps {
  mission: Mission;
  onPress: () => void;
}

const LABEL_COLORS: Record<Mission['label'], string> = {
  'Quick Win': '#2EC4B6',
  Continue: '#FF9F1C',
  'Ready to Retry': '#1F3A5F',
};

export function MissionCard({ mission, onPress }: MissionCardProps) {
  const progress = mission.totalWords > 0 ? mission.completedWords / mission.totalWords : 0;
  const badgeColor = LABEL_COLORS[mission.label];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.moduleName} numberOfLines={1}>
          {mission.moduleName}
        </Text>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{mission.label}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.wordsLeft}>{mission.wordsLeft}</Text>
        <Button title="Start" onPress={onPress} variant="primary" style={styles.startButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  moduleName: {
    flex: 1,
    fontFamily: 'Lexend_700Bold',
    fontSize: 16,
    color: '#2B2D42',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9F1C',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordsLeft: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  startButton: {
    minHeight: 40,
    paddingHorizontal: 20,
  },
});
