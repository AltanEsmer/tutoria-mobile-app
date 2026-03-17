import apiClient from './client';
import type { PronunciationCheckRequest, PronunciationCheckResponse } from '../../utils/types';
import { PRONUNCIATION_TIMEOUT_MS } from '../../utils/constants';

export async function checkPronunciation(
  req: PronunciationCheckRequest,
): Promise<PronunciationCheckResponse> {
  const { data } = await apiClient.post<PronunciationCheckResponse>(
    '/v1/pronunciation/check',
    req,
    { timeout: PRONUNCIATION_TIMEOUT_MS },
  );
  return data;
}
