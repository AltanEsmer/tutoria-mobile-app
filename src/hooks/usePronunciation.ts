import { useCallback, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { checkPronunciation } from '../services/api/pronunciation';
import { MAX_PRONUNCIATION_FAILURES } from '../utils/constants';
import type { PronunciationCheckResponse } from '../utils/types';

/**
 * Hook for recording audio and checking pronunciation against the Tutoria API.
 */
export function usePronunciation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<PronunciationCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const canSkipPronunciation = consecutiveFailures >= MAX_PRONUNCIATION_FAILURES;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Guards against the race where stopAndCheck fires before recorder.record() completes.
  const isCancelledRef = useRef(false);

  const startRecording = useCallback(async () => {
    isCancelledRef.current = false;
    try {
      setError(null);
      setResult(null);

      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) throw new Error('Microphone permission not granted');

      if (isCancelledRef.current) return;

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      if (isCancelledRef.current) return;

      await recorder.prepareToRecordAsync();

      if (isCancelledRef.current) {
        // User released before native recording could start — stop immediately so
        // the recorder doesn't stay in a prepared-but-never-started state.
        try {
          await recorder.stop();
        } catch {
          // ignore — recorder may not be in a stoppable state
        }
        return;
      }

      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error('[Pronunciation] startRecording failed:', err);
      if (!isCancelledRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to start recording');
      }
    }
  }, [recorder]);

  const stopAndCheck = useCallback(
    async (displayText: string, targetIPA: string) => {
      isCancelledRef.current = true; // signal startRecording to abort if still in flight
      setIsRecording(false);

      // Guard: if recording never reached the native layer, stop() would crash.
      if (!recorder.isRecording) {
        return null;
      }

      setIsChecking(true);

      try {
        await recorder.stop();
        console.log('[Pronunciation] recorder.stop() complete');
        // Let the OS flush the m4a file to disk before reading it.
        await new Promise<void>((r) => setTimeout(r, 100));

        // Reset audio session to playback mode — isolated so device-level errors
        // don't count against the pronunciation failure counter.
        try {
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        } catch {
          // Best-effort: audio mode reset failure should not affect pronunciation scoring
        }

        const uri = recorder.uri;

        if (!uri) throw new Error('No recording URI');

        // Validate the file exists and has non-trivial size before reading it.
        const info = await FileSystem.getInfoAsync(uri);
        const infoWithSize = info as { exists: boolean; size?: number };
        console.log('[Pronunciation] recording file:', {
          uri,
          size: infoWithSize.size,
          exists: info.exists,
        });
        if (!info.exists || (infoWithSize.size ?? 0) < 1000) {
          setError('Recording too short — please hold the button longer.');
          setConsecutiveFailures((prev) => prev + 1);
          return null;
        }

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log('[Pronunciation] base64 length:', base64.length);
        if (base64.length === 0) {
          setError('Recording too short — please hold the button longer.');
          setConsecutiveFailures((prev) => prev + 1);
          return null;
        }

        // Pre-flight: ensure word data fields are populated before sending to API.
        console.log('[Pronunciation] payload sizes:', {
          audio: base64.length,
          displayText: displayText.length,
          targetIPA: targetIPA.length,
        });
        if (!displayText.trim() || !targetIPA.trim()) {
          setError('Word data incomplete — try a different word.');
          setConsecutiveFailures((prev) => prev + 1);
          return null;
        }

        const checkResult = await checkPronunciation({
          audio: base64,
          displayText,
          targetIPA,
          // audioFormat omitted: HIGH_QUALITY preset produces .m4a; backend auto-detects format
        });

        console.log(
          '[Pronunciation] checkResult:',
          JSON.stringify({
            overallIsCorrect: checkResult.overallIsCorrect,
            similarity: checkResult.similarity,
            resultType: checkResult.resultType,
            errorType: checkResult.errorType,
            audioIssue: checkResult.audioIssue,
          }),
        );

        setResult(checkResult);
        setConsecutiveFailures(0);
        return checkResult;
      } catch {
        setConsecutiveFailures((prev) => {
          const next = prev + 1;
          setError(
            next >= MAX_PRONUNCIATION_FAILURES
              ? 'Pronunciation check unavailable. You can skip this step.'
              : 'Upload failed. Try again or skip.',
          );
          return next;
        });
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [recorder],
  );

  const resetFailures = useCallback(() => {
    setConsecutiveFailures(0);
  }, []);

  return {
    isRecording,
    isChecking,
    result,
    error,
    consecutiveFailures,
    canSkipPronunciation,
    startRecording,
    stopAndCheck,
    resetFailures,
  };
}
