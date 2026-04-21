import * as FileSystem from 'expo-file-system/legacy';

import { getAudioProxyUrl } from '../api/audio';

function getAudioCacheDir(): string {
  return `${FileSystem.cacheDirectory}audio/`;
}

function r2PathToFilename(r2Path: string): string {
  // Simple deterministic filename: base64url-encode the path, strip unsafe chars
  const encoded = btoa(r2Path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${encoded}.mp3`;
}

async function ensureCacheDirExists(): Promise<void> {
  const cacheDir = getAudioCacheDir();
  const dirInfo = await FileSystem.getInfoAsync(cacheDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
  }
}

export async function getCachedAudioUri(r2Path: string): Promise<string | null> {
  const filename = r2PathToFilename(r2Path);
  const localUri = `${getAudioCacheDir()}${filename}`;
  const info = await FileSystem.getInfoAsync(localUri);
  return info.exists ? localUri : null;
}

export async function prefetchAudioFiles(r2Paths: string[]): Promise<void> {
  await ensureCacheDirExists();

  await Promise.allSettled(
    r2Paths.map(async (r2Path) => {
      const existing = await getCachedAudioUri(r2Path);
      if (existing) return;

      const filename = r2PathToFilename(r2Path);
      const localUri = `${getAudioCacheDir()}${filename}`;
      const downloadUrl = getAudioProxyUrl(r2Path);

      await FileSystem.downloadAsync(downloadUrl, localUri);
    }),
  );
}

export async function clearAudioCache(): Promise<void> {
  const cacheDir = getAudioCacheDir();
  const dirInfo = await FileSystem.getInfoAsync(cacheDir);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
  }
}

export { getAudioCacheDir };
