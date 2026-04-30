import type { PronunciationCheckResponse } from './types';

export const PASSING_THRESHOLD = 80;

// resultType values the server emits when the user said the right word.
// Anything else ('wrong_word', 'mismatch', 'incorrect', 'partial', 'unintelligible',
// 'no_speech', etc.) is treated as a miss. Kept as a positive allow-list so
// future negative variants don't accidentally pass.
const PASSING_RESULT_TYPES = new Set([
  'correct',
  'good',
  'great',
  'pass',
  'passed',
  'two_sided_pass',
]);

// Substrings the server uses in natural-language `feedback` when the user said
// the wrong word. Pattern-matched case-insensitively. The Azure force-align
// path can return high `similarity` and even `pronunciation_match: true` for
// phonetically-close wrong words (e.g. "left" vs "pack", "slow" vs "slept"),
// while the Gemini Two-Sided judge writes a corrective message into `feedback`.
// When this substring appears, we trust the natural-language verdict.
const NEGATIVE_FEEDBACK_CUES = [
  "doesn't match",
  'does not match',
  'try again',
  'instead of',
  'wrong word',
  'i heard',
  'we heard',
  'not quite',
  "didn't catch",
];

// Azure's word accuracy score (0–100) is the ground-truth phoneme-level signal.
// When the Gemini Two-Sided judge hallucinates a PASS for a clearly wrong word
// (observed: user said "goal", judge returned `TWO_SIDED_PASS` with
// `pronunciation_match: true` and `similarity: 100`), Azure's accuracy score
// drops near zero. We require a minimum to override the higher-level judges.
// Threshold of 50 chosen empirically: real attempts at the target word score
// 60–95; wrong-word attempts (observed) score <15.
const MIN_AZURE_WORD_ACCURACY = 50;

function similarityIsPassing(similarity: number): boolean {
  // Server has historically emitted `similarity` in 0–100, but the API spec
  // example (`docs/tutoria-api.md`) shows 0–1. Normalize so either scale works:
  // values in (0,1] are treated as a 0–1 ratio, everything else as 0–100.
  const normalized = similarity > 0 && similarity <= 1 ? similarity * 100 : similarity;
  return normalized >= PASSING_THRESHOLD;
}

function feedbackHasNegativeCue(feedback: string | undefined | null): boolean {
  if (!feedback) return false;
  const lower = feedback.toLowerCase();
  return NEGATIVE_FEEDBACK_CUES.some((cue) => lower.includes(cue));
}

/**
 * Extract Azure's `wordAccuracyScore` from the opaque `azure` payload.
 * Returns `null` when the field is missing or non-numeric so callers can
 * decide whether absent data means "skip the guard" (current behaviour) or
 * "fail closed".
 */
function extractAzureWordAccuracy(azure: unknown): number | null {
  if (!azure || typeof azure !== 'object') return null;
  const raw = (azure as Record<string, unknown>)['wordAccuracyScore'];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

/**
 * Score to display on the user-facing badge.
 *
 * `result.similarity` is unsafe to display by itself: when the Two-Sided judge
 * routes through the Gemini path it sets `similarity` to the user's
 * transcription self-confidence (often 100) even when the spoken word is
 * completely wrong (observed: target "crept", user said "cake" → similarity
 * 100, pronunciation_match false, azure.wordAccuracyScore 22).
 *
 * Prefer Azure's per-phoneme `wordAccuracyScore` whenever the attempt did not
 * pass, because that's the only signal directly tied to "did the user actually
 * pronounce the target phonemes". Fall back to similarity (normalized to
 * 0–100) when Azure is absent. Clamped to 0–100.
 */
export function getDisplayScore(
  result: PronunciationCheckResponse | null | undefined,
  isPassing: boolean,
): number {
  if (!result) return 0;
  const normalizedSimilarity =
    result.similarity > 0 && result.similarity <= 1 ? result.similarity * 100 : result.similarity;
  const azureAccuracy = extractAzureWordAccuracy(result.azure);
  const raw = !isPassing && azureAccuracy !== null ? azureAccuracy : normalizedSimilarity;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, raw));
}

/**
 * Decide if a pronunciation attempt counts as "passed".
 *
 * The server emits several overlapping signals from a multi-judge pipeline
 * (Azure phoneme force-align + Gemini Two-Sided semantic judge + Mistral
 * fallback). They routinely disagree — the safest default for a phonics app
 * is to fail on any negative cue and require the ground-truth Azure score
 * to clear a floor.
 *
 *   1. errorType set                 → infrastructure failure, "no attempt".
 *   2. pronunciation_match=false     → strongest "wrong word" signal.
 *   3. resultType ∉ allow-list       → trust the labelled verdict.
 *   4. feedback text negative cue    → e.g. "I heard left, try pack" override.
 *   5. azure.wordAccuracyScore < 50  → Gemini hallucination guard. Catches
 *       cases where the high-level judge returns PASS but Azure's per-phoneme
 *       analysis shows the user said something unrelated (observed for
 *       "goal" vs "swept" — Azure scored 8/100 while Gemini said PASS).
 *   6. Then accept iff overallIsCorrect OR similarity ≥ threshold.
 */
export function isPronunciationPassing(
  result: PronunciationCheckResponse | null | undefined,
): boolean {
  if (!result) return false;
  if (result.errorType) return false;
  if (result.pronunciation_match === false) return false;
  if (result.resultType && !PASSING_RESULT_TYPES.has(result.resultType.toLowerCase())) return false;
  if (feedbackHasNegativeCue(result.feedback)) return false;

  const azureAccuracy = extractAzureWordAccuracy(result.azure);
  if (azureAccuracy !== null && azureAccuracy < MIN_AZURE_WORD_ACCURACY) return false;

  return result.overallIsCorrect || similarityIsPassing(result.similarity);
}
