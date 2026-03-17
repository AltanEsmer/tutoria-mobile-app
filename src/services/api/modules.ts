import apiClient from './client';
import type {
  Mission,
  ModuleStatus,
  SessionData,
  WordCompletionRequest,
  WordCompletionResponse,
  BatchModuleStatusRequest,
} from '../../utils/types';

export async function getMissions(profileId: string): Promise<Mission[]> {
  const { data } = await apiClient.get<Mission[]>('/v1/modules/missions', {
    params: { profileId },
  });
  return data;
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
  const { data } = await apiClient.post<SessionData>(`/v1/modules/${moduleId}`, { profileId });
  return data;
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
