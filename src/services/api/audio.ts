import { API_BASE_URL } from '../../utils/constants';
import apiClient from './client';
import type { SoundsResolveResponse } from '../../utils/types';

/**
 * Get the proxied audio URL for an R2 path.
 * Use this URL directly with expo-av for playback.
 */
export function getAudioProxyUrl(r2Path: string): string {
  return `${API_BASE_URL}/v1/audio/proxy?path=${encodeURIComponent(r2Path)}`;
}

export async function resolveSounds(ipa: string, compound = false): Promise<SoundsResolveResponse> {
  const { data } = await apiClient.get<SoundsResolveResponse>('/v1/audio/sounds-resolve', {
    params: { ipa, compound },
  });
  return data;
}
