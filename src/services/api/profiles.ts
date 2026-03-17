import apiClient from './client';
import type { Profile, CreateProfileRequest } from '../../utils/types';

export async function listProfiles(): Promise<Profile[]> {
  const { data } = await apiClient.get<{ profiles: Profile[] }>('/v1/profiles/list');
  return data.profiles;
}

export async function createProfile(req: CreateProfileRequest): Promise<string> {
  const { data } = await apiClient.post<{ profileId: string; success: boolean }>(
    '/v1/profiles/create',
    req,
  );
  return data.profileId;
}

export async function selectProfile(profileId: string): Promise<{ profileId: string; profileName: string }> {
  const { data } = await apiClient.post<{ success: boolean; profileId: string; profileName: string }>(
    '/v1/profiles/select',
    { profileId },
  );
  return { profileId: data.profileId, profileName: data.profileName };
}
