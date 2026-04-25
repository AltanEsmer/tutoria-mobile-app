import apiClient from './client';
import type { ProgressResponse, SaveProgressRequest } from '../../utils/types';
import { makeIdempotencyKey } from './idempotency';

export async function getProgress(profileId: string): Promise<ProgressResponse> {
  const { data } = await apiClient.get<ProgressResponse>(`/v1/progress/${profileId}`);
  return data;
}

/**
 * POST a pronunciation attempt result to the backend progress table.
 * Throws on network or server errors — callers should enqueue for offline retry.
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

  await apiClient.post(url, req, { headers });
}
