import { isPronunciationPassing } from '../pronunciation';
import type { PronunciationCheckResponse } from '../types';

const makeResult = (
  overrides: Partial<PronunciationCheckResponse> = {},
): PronunciationCheckResponse => ({
  overallIsCorrect: false,
  highlightedSegment: '',
  similarity: 0,
  pronunciation_match: true,
  ipa_transcription_reference: '',
  ipa_transcription_user: '',
  resultType: 'correct',
  azure: null,
  feedback: '',
  audioIssue: null,
  errorType: null,
  debug: { processingTime: 0 },
  ...overrides,
});

describe('isPronunciationPassing', () => {
  it('returns false when pronunciation_match=false, even with high similarity and overallIsCorrect=true', () => {
    expect(
      isPronunciationPassing(
        makeResult({ pronunciation_match: false, similarity: 95, overallIsCorrect: true }),
      ),
    ).toBe(false);
  });

  it('returns true when pronunciation_match=true, similarity=80, overallIsCorrect=true', () => {
    expect(
      isPronunciationPassing(
        makeResult({ pronunciation_match: true, similarity: 80, overallIsCorrect: true }),
      ),
    ).toBe(true);
  });

  it('returns true when pronunciation_match=undefined and similarity=85 (back-compat)', () => {
    expect(
      isPronunciationPassing(
        makeResult({ pronunciation_match: undefined as unknown as boolean, similarity: 85 }),
      ),
    ).toBe(true);
  });

  it('returns false when pronunciation_match=undefined, similarity=50, overallIsCorrect=false', () => {
    expect(
      isPronunciationPassing(
        makeResult({
          pronunciation_match: undefined as unknown as boolean,
          similarity: 50,
          overallIsCorrect: false,
        }),
      ),
    ).toBe(false);
  });

  it('returns false when result is null', () => {
    expect(isPronunciationPassing(null)).toBe(false);
  });

  it('returns false when resultType is "wrong_word" even with high similarity and overallIsCorrect=true', () => {
    expect(
      isPronunciationPassing(
        makeResult({
          resultType: 'wrong_word',
          similarity: 100,
          overallIsCorrect: true,
          pronunciation_match: true,
        }),
      ),
    ).toBe(false);
  });

  it('returns false when feedback contains a negative cue ("I heard left, try pack")', () => {
    expect(
      isPronunciationPassing(
        makeResult({
          similarity: 100,
          overallIsCorrect: true,
          pronunciation_match: true,
          resultType: 'correct',
          feedback: 'I heard left — try pack again',
        }),
      ),
    ).toBe(false);
  });

  it('returns false when feedback contains "doesn\'t match"', () => {
    expect(
      isPronunciationPassing(
        makeResult({
          similarity: 95,
          overallIsCorrect: true,
          feedback: "Heard slow — doesn't match, try again",
        }),
      ),
    ).toBe(false);
  });

  it('returns false when errorType is set (infrastructure failure)', () => {
    expect(
      isPronunciationPassing(
        makeResult({ errorType: 'http-5xx', similarity: 95, overallIsCorrect: true }),
      ),
    ).toBe(false);
  });

  it('treats similarity in 0–1 range as a ratio (0.92 → 92 → passing)', () => {
    expect(
      isPronunciationPassing(
        makeResult({ similarity: 0.92, overallIsCorrect: false, pronunciation_match: true }),
      ),
    ).toBe(true);
  });

  it('treats similarity 0.5 as 50% (failing)', () => {
    expect(
      isPronunciationPassing(
        makeResult({ similarity: 0.5, overallIsCorrect: false, pronunciation_match: true }),
      ),
    ).toBe(false);
  });

  it('accepts case-insensitive resultType ("CORRECT")', () => {
    expect(
      isPronunciationPassing(
        makeResult({ resultType: 'CORRECT', similarity: 85, overallIsCorrect: true }),
      ),
    ).toBe(true);
  });

  it('accepts resultType "TWO_SIDED_PASS" when Azure score is healthy', () => {
    expect(
      isPronunciationPassing(
        makeResult({
          resultType: 'TWO_SIDED_PASS',
          similarity: 100,
          overallIsCorrect: true,
          azure: { wordAccuracyScore: 75 },
        }),
      ),
    ).toBe(true);
  });

  it('rejects when Azure wordAccuracyScore < 50 even with TWO_SIDED_PASS and similarity=100 (Gemini hallucination guard)', () => {
    // Real observed payload: user said "goal" but Gemini judge returned PASS.
    expect(
      isPronunciationPassing(
        makeResult({
          resultType: 'TWO_SIDED_PASS',
          similarity: 100,
          overallIsCorrect: true,
          pronunciation_match: true,
          azure: { wordAccuracyScore: 8 },
        }),
      ),
    ).toBe(false);
  });

  it('passes when Azure wordAccuracyScore is missing (back-compat)', () => {
    expect(
      isPronunciationPassing(makeResult({ similarity: 90, overallIsCorrect: true, azure: null })),
    ).toBe(true);
  });

  it('passes when Azure object exists but has no wordAccuracyScore field', () => {
    expect(
      isPronunciationPassing(
        makeResult({
          similarity: 90,
          overallIsCorrect: true,
          azure: { fluencyScore: 0 },
        }),
      ),
    ).toBe(true);
  });

  // ─── Two-sided abstention fallback ─────────────────────────────────────────
  // Observed live: target "/ʃə/" (sh-uh), child says only "/ʃ/". Azure scores
  // the phoneme cleanly, two-sided judge's free transcription returns "/ʃ/"
  // with high confidence, but the judge labels it UNKNOWN because it didn't
  // match the full target sequence. We must accept it because "/ʃ/" is on the
  // curriculum's acceptable_variants list.
  describe('TWO_SIDED_UNKNOWN abstention fallback against acceptableVariants', () => {
    const shAbstentionResult = makeResult({
      resultType: 'TWO_SIDED_UNKNOWN',
      overallIsCorrect: null,
      pronunciation_match: false,
      similarity: 90,
      feedback: "Heard /none/ - doesn't match target. Try again.",
      ipa_transcription_user: 'none',
      ipa_transcription_reference: '/ʃə/',
      azure: {
        spokenPhonemes: ['/ʃ/', '/ʊ/'],
        concatenatedIPA: 'ʃʊ',
        wordAccuracyScore: 61,
        phonemeConfidences: { ʃ: 100, ʊ: 27 },
      },
      debug: {
        processingTime: 2366,
        twoSided: {
          result: 'UNKNOWN',
          rawTranscription: '/ʃ/',
          transcriptionConfidence: 95,
          speechDetected: true,
        },
      },
    });

    it("accepts when two-sided rawTranscription matches an acceptable variant ('/ʃ/' for target '/ʃə/')", () => {
      expect(isPronunciationPassing(shAbstentionResult, ['/ʃə/', '/ʃ/'])).toBe(true);
    });

    it('accepts variants in either delimited or bare form', () => {
      expect(isPronunciationPassing(shAbstentionResult, ['ʃə', 'ʃ'])).toBe(true);
    });

    it("doesn't accept when no variants are passed (existing behavior preserved)", () => {
      expect(isPronunciationPassing(shAbstentionResult)).toBe(false);
      expect(isPronunciationPassing(shAbstentionResult, [])).toBe(false);
    });

    it("doesn't accept when two-sided transcription confidence is below the floor", () => {
      const lowConf = makeResult({
        ...shAbstentionResult,
        debug: {
          processingTime: 0,
          twoSided: { rawTranscription: '/ʃ/', transcriptionConfidence: 40 },
        },
        // Also strip the azure concatenatedIPA fallback so only the low-confidence
        // two-sided signal is available.
        azure: { wordAccuracyScore: 61, phonemeConfidences: { ʃ: 100 } },
      });
      expect(isPronunciationPassing(lowConf, ['/ʃə/', '/ʃ/'])).toBe(false);
    });

    it("doesn't accept when the heard variant isn't on the acceptable list", () => {
      const heardWrong = makeResult({
        ...shAbstentionResult,
        debug: {
          processingTime: 0,
          twoSided: { rawTranscription: '/s/', transcriptionConfidence: 95 },
        },
        azure: { wordAccuracyScore: 61, phonemeConfidences: { s: 90 } },
      });
      expect(isPronunciationPassing(heardWrong, ['/ʃə/', '/ʃ/'])).toBe(false);
    });

    it("doesn't accept on explicit TWO_SIDED_FAIL (only abstention triggers fallback)", () => {
      const explicitFail = makeResult({
        ...shAbstentionResult,
        resultType: 'TWO_SIDED_FAIL',
      });
      expect(isPronunciationPassing(explicitFail, ['/ʃə/', '/ʃ/'])).toBe(false);
    });

    it("doesn't bypass the Azure wordAccuracyScore floor", () => {
      const lowAzure = makeResult({
        ...shAbstentionResult,
        azure: {
          spokenPhonemes: ['/ʃ/'],
          concatenatedIPA: 'ʃ',
          wordAccuracyScore: 15,
          phonemeConfidences: { ʃ: 80 },
        },
      });
      expect(isPronunciationPassing(lowAzure, ['/ʃə/', '/ʃ/'])).toBe(false);
    });

    it('falls back to Azure concatenatedIPA when no twoSided signal is present', () => {
      const noTwoSided = makeResult({
        ...shAbstentionResult,
        debug: { processingTime: 0 },
        azure: {
          spokenPhonemes: ['/ʃ/'],
          concatenatedIPA: 'ʃ',
          wordAccuracyScore: 65,
          phonemeConfidences: { ʃ: 90 },
        },
      });
      expect(isPronunciationPassing(noTwoSided, ['/ʃə/', '/ʃ/'])).toBe(true);
    });

    it('rejects Azure-fallback match when phoneme confidence is below the floor', () => {
      const lowPhoneme = makeResult({
        ...shAbstentionResult,
        debug: { processingTime: 0 },
        azure: {
          concatenatedIPA: 'ʃ',
          wordAccuracyScore: 65,
          phonemeConfidences: { ʃ: 40 },
        },
      });
      expect(isPronunciationPassing(lowPhoneme, ['/ʃə/', '/ʃ/'])).toBe(false);
    });

    it('still passes the existing TWO_SIDED_PASS happy path with variants present', () => {
      expect(
        isPronunciationPassing(
          makeResult({
            resultType: 'TWO_SIDED_PASS',
            similarity: 100,
            overallIsCorrect: true,
            azure: { wordAccuracyScore: 92 },
          }),
          ['/ʃɒp/', '/ʃɑp/'],
        ),
      ).toBe(true);
    });
  });
});
