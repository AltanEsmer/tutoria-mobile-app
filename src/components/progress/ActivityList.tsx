import React from 'react';
import { FlatList, Text, StyleSheet, View } from 'react-native';
import type { ActivityProgress } from '@/utils/types';
import { ActivityRow } from './ActivityRow';

interface ActivityListProps {
  activities: ActivityProgress[];
}

export function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No words practiced yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ActivityRow activity={item} />}
      scrollEnabled={false}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: '#9CA3AF',
  },
});
