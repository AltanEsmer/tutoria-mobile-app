import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

/**
 * Hook for haptic feedback throughout the app.
 * Silently fails on platforms where haptics are unavailable (web, simulator).
 */
export function useHaptics() {
  const successHaptic = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // haptics unavailable
    }
  }, []);

  const warningHaptic = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // haptics unavailable
    }
  }, []);

  const nfcDetectedHaptic = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // haptics unavailable
    }
  }, []);

  const buttonTapHaptic = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // haptics unavailable
    }
  }, []);

  return { successHaptic, warningHaptic, nfcDetectedHaptic, buttonTapHaptic };
}
