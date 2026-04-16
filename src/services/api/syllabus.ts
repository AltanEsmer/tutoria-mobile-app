import { getCacheEntry, getCache, setCache } from '../cache';
import { CURRICULUM_CACHE_TTL } from '../../utils/constants';
import type { Stage } from '../../utils/types';
import apiClient from './client';

const STAGES_CACHE_KEY = 'cache:syllabus:stages';

export async function getStages(): Promise<Stage[]> {
  const cached = await getCache<Stage[]>(STAGES_CACHE_KEY);
  if (cached) return cached;

  try {
    const { data } = await apiClient.get<{ success: boolean; stages: Stage[] }>(
      '/v1/syllabus/stages',
    );
    await setCache(STAGES_CACHE_KEY, data.stages, CURRICULUM_CACHE_TTL);
    return data.stages;
  } catch (err) {
    const stale = await getCacheEntry<Stage[]>(STAGES_CACHE_KEY);
    if (stale) return stale.data;
    throw err;
  }
}

export async function getStagesCacheInfo(): Promise<{ timestamp: number } | null> {
  const entry = await getCacheEntry<Stage[]>(STAGES_CACHE_KEY);
  if (!entry) return null;
  return { timestamp: entry.timestamp };
}
