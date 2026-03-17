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
  await apiClient.post(`/v1/progress/${profileId}/${activityId}`, req);
}
