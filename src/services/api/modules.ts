import { getCache, setCache, getCacheEntry } from '../cache';
import { MODULE_CACHE_TTL } from '../../utils/constants';
import type {
  Mission,
  ModuleStatus,
  SessionData,
  WordCompletionRequest,
  WordCompletionResponse,
  BatchModuleStatusRequest,
} from '../../utils/types';
import apiClient from './client';

export async function getMissions(profileId: string): Promise<Mission[]> {
  const key = `cache:missions:${profileId}`;
  const cached = await getCache<Mission[]>(key);
  if (cached) return cached;

  try {
    const { data } = await apiClient.get<Mission[]>('/v1/modules/missions', {
      params: { profileId },
    });
    await setCache(key, data, MODULE_CACHE_TTL);
    return data;
  } catch (err) {
    const stale = await getCacheEntry<Mission[]>(key);
    if (stale) return stale.data;
    throw err;
  }
}

export async function getModuleStatus(moduleId: string, profileId: string): Promise<ModuleStatus> {
  const { data } = await apiClient.get<ModuleStatus>(`/v1/modules/${moduleId}`, {
    params: { profileId },
  });
  return data;
}

export async function startOrResumeModule(
  moduleId: string,
  profileId: string,
): Promise<SessionData> {
  const key = `cache:module:${profileId}:${moduleId}`;
  try {
    const { data } = await apiClient.post<SessionData>(`/v1/modules/${moduleId}`, { profileId });
    await setCache(key, data, MODULE_CACHE_TTL);
    return data;
  } catch (err) {
    const stale = await getCacheEntry<SessionData>(key);
    if (stale) return stale.data;
    throw err;
  }
}

export async function getCachedSession(
  moduleId: string,
  profileId: string,
): Promise<SessionData | null> {
  return getCache<SessionData>(`cache:module:${profileId}:${moduleId}`);
}

export async function completeWord(
  moduleId: string,
  req: WordCompletionRequest,
): Promise<WordCompletionResponse> {
  const { data } = await apiClient.post<WordCompletionResponse>(
    `/v1/modules/${moduleId}/word`,
    req,
  );
  return data;
}

export async function abandonModule(moduleId: string, profileId: string): Promise<void> {
  await apiClient.delete(`/v1/modules/${moduleId}`, { params: { profileId } });
}

export async function batchModuleStatus(
  req: BatchModuleStatusRequest,
): Promise<Record<string, Omit<ModuleStatus, 'sessionData' | 'cooldownEndsAt'>>> {
  const { data } = await apiClient.post('/v1/modules/status/batch', req);
  return data;
}
