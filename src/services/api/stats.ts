import type { StatsResponse } from '../../utils/types';
import apiClient from './client';

/**
 * Fetch aggregate progress stats for a profile.
 *
 * Unlike `GET /v1/progress`, the `/v1/stats` endpoint does not join the
 * `activities` table, so it stays reliable even while the progress endpoint is
 * failing. Used as an authoritative source for `streakDays` in the Progress
 * page's fallback path.
 */
export async function getStats(profileId: string): Promise<StatsResponse> {
  const { data } = await apiClient.get<StatsResponse>(`/v1/stats/${profileId}`);
  return data;
}
