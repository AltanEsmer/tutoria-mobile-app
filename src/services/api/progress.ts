import apiClient from './client';
import type { ProgressResponse, SaveProgressRequest } from '../../utils/types';

export async function getProgress(profileId: string): Promise<ProgressResponse> {
  const { data } = await apiClient.get<ProgressResponse>(`/v1/progress/${profileId}`);
  return data;
}

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
  if (__DEV__) {
    console.debug('[API] saveProgress →', url, req);
  }

  await apiClient.post(url, req);
}
