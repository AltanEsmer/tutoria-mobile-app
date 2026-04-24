import apiClient from './client';
import type { ProgressResponse, SaveProgressRequest } from '../../utils/types';
import { makeIdempotencyKey } from './idempotency';

export async function getProgress(profileId: string): Promise<ProgressResponse> {
  const { data } = await apiClient.get<ProgressResponse>(`/v1/progress/${profileId}`);
  return data;
}

// Tracks whether we've already warned about saveProgress failing for this app
// session — backend handler for POST /v1/progress/:profileId/:activityId is
// known-broken (returns generic 500 even with a perfectly-formed request).
// We log once per session to flag the regression without spamming Metro on
// every word completion. Remove this flag once the backend is fixed.
let _saveProgressWarnedThisSession = false;

/**
 * POST a pronunciation attempt result to the backend progress table.
 *
 * **Currently degraded:** The backend handler is failing with `500 Failed to
 * save progress` for all valid requests (see docs/ERROR.md "saveProgress 500 —
 * backend handler degraded"). This function:
 *   - Sends a fully-correct request per the documented contract.
 *   - Suppresses the noisy 5xx logging via `_silenceErrorLogging`.
 *   - Logs a single concise warn on first failure per app session.
 *   - Does NOT throw — callers should NOT enqueue retries; the offline queue
 *     would just replay a known-broken endpoint forever.
 *
 * Restore normal error propagation (remove the try/catch) once the backend is
 * fixed.
 */
export async function saveProgress(
  profileId: string,
  activityId: string,
  req: SaveProgressRequest,
): Promise<void> {
  if (!activityId.trim() || !req.displayText.trim()) {
    console.warn(
      `[API] saveProgress skipped — empty activityId/displayText for profile ${profileId}`,
    );
    return;
  }

  const url = `/v1/progress/${profileId}/${encodeURIComponent(activityId)}`;
  const headers = { 'X-Idempotency-Key': makeIdempotencyKey() };

  try {
    await apiClient.post(url, req, { headers, _silenceErrorLogging: true });
  } catch (err: unknown) {
    if (!_saveProgressWarnedThisSession) {
      _saveProgressWarnedThisSession = true;
      const status =
        typeof err === 'object' && err !== null && 'response' in err
          ? // @ts-expect-error narrow at runtime
            err.response?.status
          : 'unknown';
      console.warn(
        `[API] saveProgress failing (status ${status}) — backend handler degraded; ` +
          'Progress tab will stay empty until backend is fixed. ' +
          'Subsequent failures suppressed for this session.',
      );
    }
    // Swallow — do NOT rethrow, do NOT enqueue offline retries for a known-broken endpoint.
  }
}
