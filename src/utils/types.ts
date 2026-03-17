/**
 * Shared TypeScript types & interfaces for the Tutoria mobile app.
 * Mirrors the Tutoria API data model.
 */

// ─── Authentication ─────────────────────────────────────────────

export interface AuthState {
  isSignedIn: boolean;
  userId: string | null;
  token: string | null;
}

// ─── Profiles ───────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface CreateProfileRequest {
  name: string;
}

export interface SelectProfileRequest {
  profileId: string;
}

// ─── Syllabus & Stages ─────────────────────────────────────────

export interface Stage {
  id: string;
  title: string;
  description: string;
  preReading: string;
  summary: string;
  moduleFiles: string[];
  items: unknown[];
}

// ─── Modules ────────────────────────────────────────────────────

export interface Mission {
  moduleId: string;
  moduleName: string;
  label: 'Quick Win' | 'Ready to Retry' | 'Continue';
  wordsLeft: string;
  color: string;
  priority: number;
  completedWords: number;
  totalWords: number;
  attempts: number;
}

export interface ModuleStatus {
  attempts: number;
  canAttempt: boolean;
  cooldownEndsAt: number | null;
  hasActiveSession: boolean;
  sessionData: SessionData | null;
}

export interface SessionData {
  words: string[];
  wordData: WordData[];
  totalWords: number;
  position: number;
  started: number;
  completedWords: string[];
  remainingWords: string[];
  moduleName: string;
  failedWords: string[];
}

export interface WordData {
  id: string;
  display_text: string;
  target_ipa?: string;
  audio_path?: string;
  [key: string]: unknown;
}

export interface WordCompletionRequest {
  profileId: string;
  wordId: string;
  isCorrect: boolean;
}

export interface WordCompletionResponse {
  success: boolean;
  completedWords: number;
  totalWords: number;
  remainingWords: number;
  isModuleComplete: boolean;
  failedWords: string[];
}

export interface BatchModuleStatusRequest {
  profileId: string;
  moduleIds: string[];
}

// ─── Progress ───────────────────────────────────────────────────

export interface ProgressItem {
  days_correct: number;
  mastered: boolean;
  last_correct_date: string | null;
  mastered_at: string | null;
}

export interface ActivityProgress {
  id: string;
  displayText: string;
  isCorrect: boolean;
  daysCorrect: number;
  mastered: boolean;
  lastDate: string | null;
}

export interface ProgressResponse {
  items: Record<string, ProgressItem>;
  activities: ActivityProgress[];
  streakDays: number;
}

export interface SaveProgressRequest {
  isCorrect: boolean;
  displayText: string;
}

// ─── Pronunciation ──────────────────────────────────────────────

export interface PronunciationCheckRequest {
  audio: string; // base64-encoded
  displayText: string;
  targetIPA: string;
  language?: string;
  audioFormat?: 'wav' | 'mp3';
  unitType?: 'phoneme' | 'syllable' | 'word';
  validation?: {
    confused: string[];
    feedback: Record<string, string>;
  };
}

export interface PronunciationCheckResponse {
  overallIsCorrect: boolean;
  highlightedSegment: string;
  similarity: number;
  pronunciation_match: boolean;
  ipa_transcription_reference: string;
  ipa_transcription_user: string;
  resultType: string;
  azure: unknown;
  feedback: string;
  audioIssue: string | null;
  errorType: string | null;
  debug: {
    processingTime: number;
  };
}

// ─── Audio ──────────────────────────────────────────────────────

export interface SoundsResolveResponse {
  resolved: boolean;
  audioPath: string;
  acceptableIPAs: string[];
}

// ─── NFC ────────────────────────────────────────────────────────

export interface NfcTagPayload {
  tagId: string;
  moduleId: string;
  isValid: boolean;
  rawData?: string;
}

export interface NfcScanState {
  isScanning: boolean;
  isSupported: boolean;
  isEnabled: boolean;
  lastTag: NfcTagPayload | null;
  error: string | null;
}

// ─── API Common ─────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export interface ApiSuccess {
  success: boolean;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}
