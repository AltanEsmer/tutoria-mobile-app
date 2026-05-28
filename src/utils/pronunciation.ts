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

// Two-sided abstention fallback thresholds. When the Gemini judge returns
// TWO_SIDED_UNKNOWN (it heard speech but wouldn't commit to PASS/FAIL),
// we cross-check against the curriculum's acceptable_variants. The judge's
// own rawTranscription is preferred — it's a free transcription rather than
// a force-alignment to the reference text, so it correctly reports "/ʃ/"
// when the user said just the consonant of a target like "/ʃə/".
const MIN_TWO_SIDED_TRANSCRIPTION_CONFIDENCE = 70;
const MIN_AZURE_PHONEME_CONFIDENCE = 60;

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

// IPA strings arrive in several shapes: `/ʃə/`, `ʃə`, `ʃ ə`, with stress marks.
// Normalize aggressively so equality against the curriculum's variant list works.
function normalizeIpa(ipa: string): string {
  return ipa
    .toLowerCase()
    .replace(/\//g, '')
    .replace(/\s+/g, '')
    .replace(/[ˈˌ]/g, '')
    .trim();
}

interface AzureLike {
  concatenatedIPA?: unknown;
  spokenPhonemes?: unknown;
  phonemeConfidences?: unknown;
}

function extractAzureSpokenIpa(azure: unknown): string | null {
  if (!azure || typeof azure !== 'object') return null;
  const a = azure as AzureLike;
  if (typeof a.concatenatedIPA === 'string' && a.concatenatedIPA.length > 0) {
    return normalizeIpa(a.concatenatedIPA);
  }
  if (Array.isArray(a.spokenPhonemes)) {
    const joined = a.spokenPhonemes.filter((p): p is string => typeof p === 'string').join('');
    if (joined.length > 0) return normalizeIpa(joined);
  }
  return null;
}

// Every phoneme that appears in `ipa` must have a confidence ≥ the floor in
// `azure.phonemeConfidences`. Single-character keys are checked by `includes`;
// multi-character entries (e.g. "tʃ", "oʊ") are included verbatim if Azure
// emits them as a key. Missing keys fail closed — we'd rather be strict than
// accept a low-confidence variant match.
function azurePhonemesAllConfident(azure: unknown, ipa: string): boolean {
  if (!azure || typeof azure !== 'object') return false;
  const confidences = (azure as AzureLike).phonemeConfidences;
  if (!confidences || typeof confidences !== 'object') return false;
  const map = confidences as Record<string, unknown>;
  for (const phoneme of Object.keys(map)) {
    if (!ipa.includes(phoneme)) continue;
    const c = map[phoneme];
    if (typeof c !== 'number' || c < MIN_AZURE_PHONEME_CONFIDENCE) return false;
  }
  return true;
}

interface TwoSidedLike {
  rawTranscription?: unknown;
  transcriptionConfidence?: unknown;
}

function extractTwoSidedTranscription(
  debug: unknown,
): { ipa: string; confidence: number } | null {
  if (!debug || typeof debug !== 'object') return null;
  const ts = (debug as { twoSided?: unknown }).twoSided;
  if (!ts || typeof ts !== 'object') return null;
  const t = ts as TwoSidedLike;
  if (typeof t.rawTranscription !== 'string') return null;
  const ipa = normalizeIpa(t.rawTranscription);
  if (!ipa) return null;
  const confidence = typeof t.transcriptionConfidence === 'number' ? t.transcriptionConfidence : 0;
  return { ipa, confidence };
}

/**
 * Does what Azure / the two-sided judge heard match one of the curriculum's
 * acceptable variants for this word? Used as a fallback only when the judge
 * abstained (TWO_SIDED_UNKNOWN). The curriculum lists shorter variants for
 * targets like "/ʃə/" — kids often produce just "/ʃ/" and that's correct.
 */
function matchesAcceptableVariant(
  result: PronunciationCheckResponse,
  acceptableVariants: readonly string[],
): boolean {
  const normalizedVariants = acceptableVariants.map(normalizeIpa).filter((v) => v.length > 0);
  if (normalizedVariants.length === 0) return false;

  const twoSided = extractTwoSidedTranscription(result.debug);
  if (twoSided && twoSided.confidence >= MIN_TWO_SIDED_TRANSCRIPTION_CONFIDENCE) {
    if (normalizedVariants.includes(twoSided.ipa)) return true;
  }

  const azureIpa = extractAzureSpokenIpa(result.azure);
  if (azureIpa && normalizedVariants.includes(azureIpa)) {
    if (azurePhonemesAllConfident(result.azure, azureIpa)) return true;
  }

  return false;
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
 *   1. errorType set                  → infrastructure failure, "no attempt".
 *   2. azure.wordAccuracyScore < 50   → Gemini hallucination guard. Applied
 *       early so the abstention fallback below cannot bypass it.
 *   3. Two-sided abstention fallback → when the judge returned UNKNOWN but
 *       Azure / its own rawTranscription heard an acceptable variant of the
 *       target (e.g. "/ʃ/" for target "/ʃə/"), accept it.
 *   4. pronunciation_match=false      → strongest "wrong word" signal.
 *   5. resultType ∉ allow-list        → trust the labelled verdict.
 *   6. feedback text negative cue     → e.g. "I heard left, try pack" override.
 *   7. Then accept iff overallIsCorrect OR similarity ≥ threshold.
 */
export function isPronunciationPassing(
  result: PronunciationCheckResponse | null | undefined,
  acceptableVariants?: readonly string[],
): boolean {
  if (!result) return false;
  if (result.errorType) return false;

  const azureAccuracy = extractAzureWordAccuracy(result.azure);
  if (azureAccuracy !== null && azureAccuracy < MIN_AZURE_WORD_ACCURACY) return false;

  const isAbstention =
    typeof result.resultType === 'string' &&
    result.resultType.toLowerCase() === 'two_sided_unknown' &&
    (result.overallIsCorrect === null || result.overallIsCorrect === undefined);
  if (isAbstention && acceptableVariants && acceptableVariants.length > 0) {
    if (matchesAcceptableVariant(result, acceptableVariants)) return true;
  }

  if (result.pronunciation_match === false) return false;
  if (result.resultType && !PASSING_RESULT_TYPES.has(result.resultType.toLowerCase())) return false;
  if (feedbackHasNegativeCue(result.feedback)) return false;

  return result.overallIsCorrect === true || similarityIsPassing(result.similarity);
}
