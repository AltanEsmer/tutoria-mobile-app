import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { WordData } from '@/utils/types';

interface WordDisplayProps {
  word: WordData;
  isActive?: boolean;
}

export function WordDisplay({ word, isActive: _isActive }: WordDisplayProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.displayText}>{word.display_text}</Text>
      {word.target_ipa ? <Text style={styles.ipaText}>/{word.target_ipa}/</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  displayText: {
    fontSize: 64,
    fontFamily: 'Lexend_700Bold',
    color: '#2B2D42',
    textAlign: 'center',
  },
  ipaText: {
    fontSize: 24,
    fontFamily: 'Lexend_400Regular',
    color: '#1F3A5F',
    textAlign: 'center',
    marginTop: 16,
  },
});
