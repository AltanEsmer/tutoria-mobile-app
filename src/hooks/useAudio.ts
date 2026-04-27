import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import warmerSource from '../../assets/audio/silence-100ms.mp3';
import { downloadAndCacheAudio, getCachedAudioUri } from '../services/cache';

const LOADING_GRACE_MS = 150;
const ERROR_TIMEOUT_MS = 2000;
const PLAY_FALLBACK_MS = 250;

type PlaybackState = 'idle' | 'loading' | 'playing' | 'error';

interface UseAudioOptions {
  /** When true, calling `setAudioPath` will immediately trigger playback. */
  autoPlay?: boolean;
}

/**
 * Hook for audio playback via the Tutoria audio proxy.
 *
 * Uses a single `useAudioPlayer` instance (primed with a warmer asset) and
 * drives state via a `playbackStatusUpdate` listener — no per-tap player
 * creation, no polling, no `useAudioPlayerStatus`.
 */
export function useAudio(options?: UseAudioOptions) {
  const { autoPlay = false } = options ?? {};

  const [state, setState] = useState<PlaybackState>('idle');
  const [audioError, setAudioError] = useState<string | null>(null);

  const player = useAudioPlayer(warmerSource);

  // Gate flag: true between player.replace() and the first isLoaded event.
  const readyForPlayRef = useRef(false);

  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // Single listener — state machine for the native player lifecycle.
  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && readyForPlayRef.current) {
        // Source is ready: open the gate, clear pending timers, start playing.
        readyForPlayRef.current = false;
        clearTimers();
        player.play();
        return;
      }
      if (status.playing) {
        clearTimers();
        setState('playing');
      } else if (status.didJustFinish) {
        clearTimers();
        setState('idle');
      }
    });

    return () => {
      subscription.remove();
      clearTimers();
    };
  }, [player, clearTimers]);

  const play = useCallback(
    async (r2PathOrUrl: string) => {
      if (!r2PathOrUrl || r2PathOrUrl.trim() === '') {
        setAudioError('No audio available for this word');
        return;
      }

      clearTimers();
      readyForPlayRef.current = false;
      setAudioError(null);

      // Show loading indicator only after 150ms grace — avoids flash for fast cached plays.
      loadingTimerRef.current = setTimeout(() => {
        loadingTimerRef.current = null;
        setState('loading');
      }, LOADING_GRACE_MS);

      try {
        let uri: string;

        if (r2PathOrUrl.startsWith('http://') || r2PathOrUrl.startsWith('https://')) {
          uri = r2PathOrUrl;
        } else {
          const cachedUri = await getCachedAudioUri(r2PathOrUrl);
          uri = cachedUri ?? (await downloadAndCacheAudio(r2PathOrUrl));
        }

        // Gate MUST open before replace() — preloaded sources emit isLoaded synchronously.
        readyForPlayRef.current = true;
        player.replace({ uri });

        // 250ms fallback: call play() directly in case the listener never fires.
        fallbackTimerRef.current = setTimeout(() => {
          fallbackTimerRef.current = null;
          if (readyForPlayRef.current) {
            readyForPlayRef.current = false;
            player.play();
          }
        }, PLAY_FALLBACK_MS);

        // 2000ms error ceiling: surface an error if the native player stays silent.
        errorTimerRef.current = setTimeout(() => {
          errorTimerRef.current = null;
          readyForPlayRef.current = false;
          clearTimers();
          setState('error');
          setAudioError('Audio playback timed out');
        }, ERROR_TIMEOUT_MS);
      } catch (err) {
        clearTimers();
        readyForPlayRef.current = false;
        setState('error');
        setAudioError(err instanceof Error ? err.message : 'Audio playback failed');
      }
    },
    [player, clearTimers],
  );

  const stop = useCallback(() => {
    clearTimers();
    readyForPlayRef.current = false;
    player.pause();
    setState('idle');
  }, [player, clearTimers]);

  /**
   * Set the current audio path. When `autoPlay` is enabled, triggers `play`
   * immediately; otherwise the path is ignored (caller invokes `play` manually).
   */
  const setAudioPath = useCallback(
    (r2Path: string) => {
      if (autoPlay) {
        play(r2Path);
      }
    },
    [autoPlay, play],
  );

  return {
    play,
    stop,
    setAudioPath,
    isLoading: state === 'loading',
    audioError,
    state,
  };
}
