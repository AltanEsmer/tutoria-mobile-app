import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { getAudioProxyUrl } from '../services/api/audio';

interface UseAudioOptions {
  /** When true, calling `setAudioPath` will immediately trigger playback. */
  autoPlay?: boolean;
}

/**
 * Hook for audio playback via the Tutoria audio proxy.
 *
 * @param options.autoPlay - When true, `setAudioPath` triggers playback automatically
 *   whenever the path changes. Defaults to false.
 */
export function useAudio(options?: UseAudioOptions) {
  const { autoPlay = false } = options ?? {};

  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const playerRef = useRef<AudioPlayer | null>(null);

  const cleanupPlayer = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.remove();
      playerRef.current = null;
    }
  }, []);

  /**
   * Load audio from an R2 path and play it, managing loading/error state.
   * Safe to call concurrently — previous sound is cleaned up first.
   */
  const loadAndPlay = useCallback(
    async (r2Path: string) => {
      setIsLoading(true);
      setAudioError(null);
      try {
        cleanupPlayer();
        const url = getAudioProxyUrl(r2Path);
        const player = createAudioPlayer({ uri: url });
        playerRef.current = player;
        player.play();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Audio playback failed';
        setAudioError(message);
        console.error('[Audio] Playback failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [cleanupPlayer],
  );

  // Backward-compatible play — delegates to loadAndPlay for unified loading state.
  const play = useCallback(
    async (r2Path: string) => {
      await loadAndPlay(r2Path);
    },
    [loadAndPlay],
  );

  const stop = useCallback(() => {
    cleanupPlayer();
  }, [cleanupPlayer]);

  /**
   * Set the current audio path. When `autoPlay` is enabled, triggers `loadAndPlay`
   * immediately; otherwise stores the path for manual playback via `play`.
   */
  const setAudioPath = useCallback(
    (r2Path: string) => {
      if (autoPlay) {
        loadAndPlay(r2Path);
      }
    },
    [autoPlay, loadAndPlay],
  );

  // Cleanup on unmount to prevent memory leaks.
  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, [cleanupPlayer]);

  return { play, stop, loadAndPlay, setAudioPath, isLoading, audioError };
}
