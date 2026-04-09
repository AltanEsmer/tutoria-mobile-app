import { useCallback, useRef } from 'react';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { getAudioProxyUrl } from '../services/api/audio';

/**
 * Hook for audio playback via the Tutoria audio proxy.
 */
export function useAudio() {
  const playerRef = useRef<AudioPlayer | null>(null);

  const play = useCallback(async (r2Path: string) => {
    try {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
      }

      const url = getAudioProxyUrl(r2Path);
      const player = createAudioPlayer({ uri: url });
      playerRef.current = player;
      player.play();
    } catch (err) {
      console.error('[Audio] Playback failed:', err);
    }
  }, []);

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.remove();
      playerRef.current = null;
    }
  }, []);

  return { play, stop };
}
