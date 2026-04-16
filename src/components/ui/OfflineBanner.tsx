import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '../../stores/useNetworkStore';

const BANNER_HEIGHT = 44;

export function OfflineBanner(): React.ReactElement | null {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOnline ? -BANNER_HEIGHT : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, translateY]);

  return (
    <Animated.View
      style={[styles.banner, { top: insets.top, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel="Offline status banner"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>📡</Text>
        <Text style={styles.text}>You're offline — progress will sync when reconnected</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    backgroundColor: '#FEF3C7',
    zIndex: 999,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
});
