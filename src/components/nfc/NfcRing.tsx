import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface NfcRingProps {
  isScanning: boolean;
}

/**
 * Animated pulsing concentric rings shown while NFC scanning is in progress.
 */
export function NfcRing({ isScanning }: NfcRingProps) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isScanning) {
      const createPulse = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        );

      animRef.current = Animated.parallel([
        createPulse(ring1, 0),
        createPulse(ring2, 400),
        createPulse(ring3, 800),
      ]);
      animRef.current.start();
    } else {
      animRef.current?.stop();
      ring1.setValue(0);
      ring2.setValue(0);
      ring3.setValue(0);
    }

    return () => {
      animRef.current?.stop();
    };
  }, [isScanning, ring1, ring2, ring3]);

  if (!isScanning) return null;

  const makeRingStyle = (anim: Animated.Value, size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    opacity: anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 0.3, 0],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.4],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, makeRingStyle(ring3, 120)]} />
      <Animated.View style={[styles.ring, makeRingStyle(ring2, 90)]} />
      <Animated.View style={[styles.ring, makeRingStyle(ring1, 60)]} />
      <View style={styles.center} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    width: 140,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#1F3A5F',
  },
  center: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1F3A5F',
  },
});
