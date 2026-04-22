import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '../../stores/useNetworkStore';

const BANNER_HEIGHT = 44;

export function OfflineBanner(): React.ReactElement | null {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const hasBeenOnline = useNetworkStore((s) => s.hasBeenOnline);
  const insets = useSafeAreaInsets();

  // The hide offset must account for insets.top so the banner slides fully off-screen.
  // Using only -BANNER_HEIGHT leaves the banner partially visible behind the status bar
  // on iPhones with Dynamic Island / notch (insets.top ≈ 59px).
  // SafeAreaProvider with initialWindowMetrics ensures insets.top is correct on first render.
  const hideOffset = -(BANNER_HEIGHT + insets.top + 16);
  const [translateY] = useState(() => new Animated.Value(hideOffset));

  useEffect(() => {
    // Only animate visible when we have previously confirmed an online state —
    // this prevents the banner from ever showing during app startup.
    const shouldShow = hasBeenOnline && !isOnline;
    Animated.timing(translateY, {
      toValue: shouldShow ? 0 : hideOffset,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, hasBeenOnline, translateY, hideOffset]);

  return (
    <Animated.View
      style={[
        styles.banner,
        // Sit just below the status bar / front-camera notch.
        // translateY starts at hideOffset (fully above screen) and animates to 0 when offline.
        { top: insets.top + 8, transform: [{ translateY }] },
      ]}
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
    left: 16,
    right: 16,
    height: BANNER_HEIGHT,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    zIndex: 999,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
