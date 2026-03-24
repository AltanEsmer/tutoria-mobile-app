import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getStages } from '@/services/api';
import type { Stage } from '@/utils/types';

function extractModuleName(filePath: string): string {
  const filename = filePath.split('/').pop()?.replace('.json', '') ?? filePath;
  return filename.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}

function extractModuleId(filePath: string): string {
  return filePath.split('/').pop()?.replace('.json', '') ?? filePath;
}

export default function SyllabusScreen() {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);

  useEffect(() => {
    getStages()
      .then(setStages)
      .catch(() => setError('Failed to load syllabus. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  function toggleStage(stageId: string) {
    setExpandedStageId((prev) => (prev === stageId ? null : stageId));
  }

  function handleModulePress(filePath: string) {
    const moduleId = extractModuleId(filePath);
    router.push(`/(public)/lesson/${moduleId}`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF9F1C" />
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Curriculum</Text>
        <Text style={styles.subtitle}>Explore phonics stages and modules</Text>
      </View>

      {stages.map((stage) => {
        const isExpanded = expandedStageId === stage.id;

        return (
          <View key={stage.id} style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleStage(stage.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.stageTitle}>{stage.title}</Text>
                <Text style={styles.stageDescription} numberOfLines={isExpanded ? undefined : 2}>
                  {stage.description}
                </Text>
                {!isExpanded && (
                  <Text style={styles.moduleCount}>
                    {stage.moduleFiles.length} module{stage.moduleFiles.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
              <Text style={styles.chevron}>{isExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.expandedContent}>
                {stage.summary ? <Text style={styles.summaryText}>{stage.summary}</Text> : null}

                {stage.moduleFiles.map((filePath, index) => {
                  const isLast = index === stage.moduleFiles.length - 1;
                  return (
                    <TouchableOpacity
                      key={filePath}
                      style={[styles.moduleRow, isLast && styles.moduleRowLast]}
                      onPress={() => handleModulePress(filePath)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.lockIcon}>🔒</Text>
                      <Text style={styles.moduleName}>{extractModuleName(filePath)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDFBF7',
  },
  errorText: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 15,
    color: '#E71D36',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 20,
    paddingTop: 8,
  },
  title: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 28,
    color: '#1F3A5F',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: '#2B2D42',
    opacity: 0.7,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  stageTitle: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 18,
    color: '#1F3A5F',
    marginBottom: 4,
  },
  stageDescription: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 13,
    color: '#2B2D42',
    opacity: 0.8,
  },
  moduleCount: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: '#2EC4B6',
    marginTop: 6,
  },
  chevron: {
    fontSize: 16,
    color: '#1F3A5F',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryText: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 13,
    color: '#2B2D42',
    opacity: 0.75,
    paddingVertical: 12,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  moduleRowLast: {
    borderBottomWidth: 0,
  },
  lockIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  moduleName: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 15,
    color: '#2B2D42',
    textTransform: 'capitalize',
  },
});
