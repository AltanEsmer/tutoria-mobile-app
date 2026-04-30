import {
  useAudioRecorder,
  useAudioRecorderState,
  IOSOutputFormat,
  AudioQuality,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkPronunciation } from '../services/api/pronunciation';
import { useProfileStore } from '../stores/useProfileStore';
import { MAX_PRONUNCIATION_FAILURES } from '../utils/constants';
import type { PronunciationCheckRequest, PronunciationCheckResponse } from '../utils/types';

// Local alias — Stream A adds profileId to PronunciationCheckRequest in types.ts.
type PronunciationRequestExtended = PronunciationCheckRequest & { profileId?: string };

// Word-level validation hints — Stream A extends WordData with this field.
type WordValidation = { confused: string[]; feedback: Record<string, string> };

const METERING_INTERVAL_MS = 80;
// Calibrated against real iOS device recordings of children speaking single words.
// expo-audio metering returns negative dB; we normalize via (metering+60)/60 → [0,1].
// Normal indoor speech peaks at ~0.45-0.70; loud speech 0.70-0.95; ambient noise 0.10-0.25.
const MIN_SPEECH_PEAK = 0.35; // peak threshold — any frame this loud counts as speech
const MIN_SPEECH_FRAMES = 3; // OR: 3 consecutive frames (~240ms) above noise floor
const CALIBRATION_MS = 240; // short window — must finish before short presses release
const MAX_DURATION_MS = 5000; // hard cap

/**
 * Hook for recording audio and checking pronunciation against the Tutoria API.
 */
export function usePronunciation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<PronunciationCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [peakDetected, setPeakDetected] = useState(false);

  const canSkipPronunciation = consecutiveFailures >= MAX_PRONUNCIATION_FAILURES;

  // C1 — Explicit WAV config: IOSOutputFormat.LINEARPCM forces AVAudioRecorder to write real
  // PCM into the .wav container. Without this, iOS defaults to MPEG4-AAC, the server's WAV
  // decoder hands AAC bytes to Azure Speech as PCM, and similarity always returns 0.
  const recorder = useAudioRecorder({
    isMeteringEnabled: true,
    extension: '.wav',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
    ios: {
      outputFormat: IOSOutputFormat.LINEARPCM,
      audioQuality: AudioQuality.HIGH,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
  });
  const recorderState = useAudioRecorderState(recorder, METERING_INTERVAL_MS);

  // Guards against the race where stopAndCheck fires before recorder.record() completes.
  const isCancelledRef = useRef(false);

  // C3 — Silence-gate metering refs
  const peakRef = useRef(0); // max normalized level seen since record start
  const peakDetectedRef = useRef(false); // ref mirror for use inside stopAndCheck callback
  const noiseFloorRef = useRef(0.2); // calibrated from first CALIBRATION_MS; default 0.20
  const calibrationFramesRef = useRef<number[]>([]);
  const isCalibrationDoneRef = useRef(false);
  const consecutiveSpeechFramesRef = useRef(0);
  const meteringFrameCountRef = useRef(0); // diagnostic: frames received per recording
  const droppedFrameCountRef = useRef(0); // diagnostic: stale frames dropped per recording
  const lastMeteringValueRef = useRef<number | null>(null); // dedupe stale ticks across sessions
  // Timestamp set immediately after recorder.record() returns. Frames whose tick arrives
  // before start + WARMUP_MS are dropped — they carry the metering value from the
  // previous (stopped) session and would otherwise corrupt noise-floor calibration.
  const recordingStartedAtRef = useRef<number>(0);
  const WARMUP_MS = 120;

  // C3 — Metering effect: normalize raw dB to [0,1] and track speech presence.
  // expo-audio returns negative dB where 0 = max; map via (metering + 60) / 60.
  // Two parallel speech-detection paths (whichever fires first wins):
  //   (A) Peak-only: any single frame ≥ MIN_SPEECH_PEAK — robust against short presses
  //       and survives even if calibration never completes.
  //   (B) Sustained: MIN_SPEECH_FRAMES consecutive frames above calibrated noise floor.
  useEffect(() => {
    if (!isRecording) return;
    const rawMetering = recorderState.metering;
    if (rawMetering === undefined || rawMetering === null) return;

    // Warm-up gate: useAudioRecorderState polls native metering continuously, so the
    // first ticks after isRecording flips can still carry the previous session's last
    // value (recorder.record() is not awaited — there's a small window before the
    // native layer is truly capturing fresh audio). Drop frames inside this window
    // so they cannot pollute noise-floor calibration.
    const sinceStartMs = Date.now() - recordingStartedAtRef.current;
    if (recordingStartedAtRef.current === 0 || sinceStartMs < WARMUP_MS) {
      droppedFrameCountRef.current += 1;
      return;
    }

    // Belt-and-suspenders: if the very first post-warmup tick still equals the
    // previous session's last value, treat it as stale and drop it.
    if (
      meteringFrameCountRef.current === 0 &&
      lastMeteringValueRef.current !== null &&
      rawMetering === lastMeteringValueRef.current
    ) {
      droppedFrameCountRef.current += 1;
      return;
    }
    lastMeteringValueRef.current = rawMetering;
    meteringFrameCountRef.current += 1;

    // One-shot diagnostic on the first accepted frame of each session.
    if (meteringFrameCountRef.current === 1) {
      console.log('[Pronunciation] first metering frame:', {
        rawMetering,
        normalized: Math.max(0, Math.min(1, (rawMetering + 60) / 60)).toFixed(3),
        sinceStartMs,
        droppedFrames: droppedFrameCountRef.current,
      });
    }

    const normalized = Math.max(0, Math.min(1, (rawMetering + 60) / 60));

    if (normalized > peakRef.current) {
      peakRef.current = normalized;
    }

    // Calibration phase: collect first ~240ms of frames to establish noise floor.
    // Kept short so brief presses (single short words) still complete calibration.
    const calibrationTarget = Math.ceil(CALIBRATION_MS / METERING_INTERVAL_MS);
    if (!isCalibrationDoneRef.current) {
      calibrationFramesRef.current.push(normalized);
      if (calibrationFramesRef.current.length >= calibrationTarget) {
        const avg =
          calibrationFramesRef.current.reduce((a, b) => a + b, 0) /
          calibrationFramesRef.current.length;
        noiseFloorRef.current = Math.max(0.1, Math.min(0.35, avg));
        isCalibrationDoneRef.current = true;
      }
      // Path A still applies during calibration — don't return early.
    }

    // Path B — sustained speech above noise floor (only after calibration).
    if (isCalibrationDoneRef.current) {
      if (normalized > noiseFloorRef.current) {
        consecutiveSpeechFramesRef.current += 1;
      } else {
        consecutiveSpeechFramesRef.current = 0;
      }
    }

    if (
      !peakDetectedRef.current &&
      // Path A — any frame loud enough is unambiguous speech, regardless of calibration state
      (peakRef.current >= MIN_SPEECH_PEAK ||
        // Path B — sustained frames above calibrated noise floor
        (isCalibrationDoneRef.current && consecutiveSpeechFramesRef.current >= MIN_SPEECH_FRAMES))
    ) {
      peakDetectedRef.current = true;
      setPeakDetected(true);
    }
  }, [recorderState.metering, isRecording]);

  const startRecording = useCallback(async () => {
    isCancelledRef.current = false;

    // Reset silence-gate state for this recording session.
    // CRITICAL: every ref must be reset — leftover state from the previous attempt
    // (e.g., a noise floor calibrated on speech, or sustained-frame counter) causes
    // false silence-gate trips on the next press.
    peakRef.current = 0;
    peakDetectedRef.current = false;
    setPeakDetected(false);
    calibrationFramesRef.current = [];
    isCalibrationDoneRef.current = false;
    consecutiveSpeechFramesRef.current = 0;
    noiseFloorRef.current = 0.2;
    meteringFrameCountRef.current = 0;
    droppedFrameCountRef.current = 0;
    // CRITICAL: clear cross-session dedupe state — leftover value from the previous
    // attempt would only filter the first matching tick, letting subsequent stale
    // frames pollute calibration on retry.
    lastMeteringValueRef.current = null;
    recordingStartedAtRef.current = 0;

    try {
      setError(null);
      setResult(null);

      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) throw new Error('Microphone permission not granted');

      if (isCancelledRef.current) return;

      // C4 — setAudioModeAsync call #1: enable recording mode before capture.
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
      // Stamp BEFORE flipping isRecording so the metering effect has a non-zero
      // reference point on its first run.
      recordingStartedAtRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      console.error('[Pronunciation] startRecording failed:', err);
      if (!isCancelledRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to start recording');
      }
    }
  }, [recorder]);

  // C2 — stopAndCheck accepts optional validation hints to route server to Gemini Two-Sided judge.
  const stopAndCheck = useCallback(
    async (displayText: string, targetIPA: string, validation?: WordValidation) => {
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
        // Let the OS flush the wav file to disk before reading it.
        await new Promise<void>((r) => setTimeout(r, 100));

        // C4 — setAudioModeAsync call #2: restore playback mode after recording.
        // Restores iOS session to Playback so output routes to speaker, not earpiece.
        try {
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        } catch {
          // Best-effort: audio mode reset failure should not affect pronunciation scoring
        }

        // C3 — Silence gate: skip the network call if no speech was detected.
        // DO NOT increment consecutiveFailures — silence is not a pronunciation attempt.
        console.log('[Pronunciation] silence-gate diagnostics:', {
          peakDetected: peakDetectedRef.current,
          peakLevel: peakRef.current.toFixed(3),
          noiseFloor: noiseFloorRef.current.toFixed(3),
          calibrated: isCalibrationDoneRef.current,
          framesReceived: meteringFrameCountRef.current,
          MIN_SPEECH_PEAK,
          MIN_SPEECH_FRAMES,
        });
        if (!peakDetectedRef.current) {
          setError("We couldn't hear you — try holding the button while speaking clearly");
          return null;
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

        // C2 — Build request with explicit format, unit type, language, validation, and profileId.
        const profileId = useProfileStore.getState().activeProfile?.id;
        const request: PronunciationRequestExtended = {
          audio: base64,
          displayText,
          targetIPA,
          audioFormat: 'wav',
          unitType: 'word',
          language: 'english',
          ...(validation ? { validation } : {}),
          ...(profileId ? { profileId } : {}),
        };

        const checkResult = await checkPronunciation(request as PronunciationCheckRequest);

        // Full response dump — keep until the pronunciation pipeline is stable.
        // The narrow log below hides resultType nuances and feedback text that
        // explain false-positive passes (e.g. "left" graded as "pack").
        console.log('[Pronunciation] FULL response:', JSON.stringify(checkResult));

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

        // Infrastructure errors signaled in errorType must not count as wrong attempts.
        if (checkResult.errorType) {
          setError('Pronunciation check unavailable — please try again');
          return null;
        }

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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isRecording,
    isChecking,
    result,
    error,
    consecutiveFailures,
    canSkipPronunciation,
    peakDetected,
    startRecording,
    stopAndCheck,
    resetFailures,
    clearError,
  };
}

// Suppress unused-import warning — MAX_DURATION_MS is the hard-cap constant from the
// SPEAK pipeline spec; currently used as a reference value for future auto-stop wiring.
void MAX_DURATION_MS;
