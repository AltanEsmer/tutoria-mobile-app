import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CacheEntry } from '../../utils/types';

export async function getCache<T>(key: string): Promise<T | null> {
  const entry = await getCacheEntry<T>(key);
  if (!entry) return null;
  const isExpired = Date.now() > entry.timestamp + entry.ttl;
  if (isExpired) return null;
  return entry.data;
}

export async function setCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: ttlMs };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
}

export async function clearCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function getCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}
