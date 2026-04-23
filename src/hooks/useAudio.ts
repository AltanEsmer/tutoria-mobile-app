import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { downloadAndCacheAudio, getCachedAudioUri } from '../services/cache';

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
      if (!r2Path || r2Path.trim() === '') {
        console.warn('[Audio] play called with empty r2Path');
        setAudioError('No audio available for this word');
        setIsLoading(false);
        return;
      }
      console.log('[Audio] loadAndPlay start, r2Path:', r2Path);
      setIsLoading(true);
      setAudioError(null);
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        console.log('[Audio] mode switched to playback');
        cleanupPlayer();
        // Cache-first: check local cache, then download with auth before handing to native player
        const cachedUri = await getCachedAudioUri(r2Path);
        console.log('[Audio] cache', cachedUri ? 'hit' : 'miss', cachedUri ?? '(none)');
        let localUri: string | null;
        if (cachedUri) {
          localUri = cachedUri;
        } else {
          console.log('[Audio] downloading from proxy…');
          localUri = await downloadAndCacheAudio(r2Path);
          console.log('[Audio] download complete, localUri:', localUri);
        }
        if (!localUri) throw new Error(`Failed to load audio for path: ${r2Path}`);
        console.log('[Audio] creating player');
        const player = createAudioPlayer(localUri);
        playerRef.current = player;
        player.play();
        console.log('[Audio] play() called');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Audio playback failed';
        setAudioError(message);
        console.error('[Audio] Playback failed:', err);
        try {
          if (err != null && typeof err === 'object') {
            const e = err as Record<string, unknown>;
            console.log(
              '[Audio] error details — name:',
              e['name'],
              'code:',
              e['code'],
              'status:',
              e['status'],
            );
          }
        } catch {
          // defensive: ignore secondary errors while logging error properties
        }
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
