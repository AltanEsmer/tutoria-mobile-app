import apiClient from './client';
import type { Stage } from '../../utils/types';

export async function getStages(): Promise<Stage[]> {
  const { data } = await apiClient.get<{ success: boolean; stages: Stage[] }>('/v1/syllabus/stages');
  return data.stages;
}
