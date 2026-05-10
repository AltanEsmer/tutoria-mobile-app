import { PRONUNCIATION_TIMEOUT_MS } from '../../utils/constants';
import type { PronunciationCheckRequest, PronunciationCheckResponse } from '../../utils/types';
import apiClient from './client';

export async function checkPronunciation(
  req: PronunciationCheckRequest,
  options?: { signal?: AbortSignal },
): Promise<PronunciationCheckResponse> {
  const body: PronunciationCheckRequest = {
    audioFormat: 'wav',
    unitType: 'word',
    language: 'english',
    ...req,
  };
  const { data } = await apiClient.post<PronunciationCheckResponse>(
    '/v1/pronunciation/check',
    body,
    {
      timeout: PRONUNCIATION_TIMEOUT_MS,
      ...(req.profileId ? { headers: { 'X-Device-Id': req.profileId } } : {}),
      ...(options?.signal ? { signal: options.signal } : {}),
    },
  );
  return data;
}
