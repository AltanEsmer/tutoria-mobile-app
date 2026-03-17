import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { getAudioProxyUrl } from '../services/api/audio';

/**
 * Hook for audio playback via the Tutoria audio proxy.
 */
export function useAudio() {
  const soundRef = useRef<Audio.Sound | null>(null);

  const play = useCallback(async (r2Path: string) => {
    try {
      // Unload previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const url = getAudioProxyUrl(r2Path);
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      await sound.playAsync();
    } catch (err) {
      console.error('[Audio] Playback failed:', err);
    }
  }, []);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, []);

  return { play, stop };
}
