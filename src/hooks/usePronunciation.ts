import { useCallback, useState } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { checkPronunciation } from '../services/api/pronunciation';
import type { PronunciationCheckResponse } from '../utils/types';

/**
 * Hook for recording audio and checking pronunciation against the Tutoria API.
 */
export function usePronunciation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<PronunciationCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);

      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) throw new Error('Microphone permission not granted');

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }, [recorder]);

  const stopAndCheck = useCallback(
    async (displayText: string, targetIPA: string) => {
      try {
        setIsRecording(false);
        setIsChecking(true);

        await recorder.stop();
        const uri = recorder.uri;

        if (!uri) throw new Error('No recording URI');

        // Read file as base64
        const response = await fetch(uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const checkResult = await checkPronunciation({
          audio: base64,
          displayText,
          targetIPA,
          audioFormat: 'wav',
        });

        setResult(checkResult);
        return checkResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Pronunciation check failed';
        setError(message);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [recorder],
  );

  return {
    isRecording,
    isChecking,
    result,
    error,
    startRecording,
    stopAndCheck,
  };
}
