import { MODULE_CACHE_TTL } from '../../utils/constants';
import type {
  Mission,
  ModuleStatus,
  SessionData,
  WordData,
  WordCompletionRequest,
  WordCompletionResponse,
  BatchModuleStatusRequest,
} from '../../utils/types';
import { getCache, setCache, getCacheEntry, clearCache } from '../cache';
import { resolveSounds, getAudioProxyUrl } from './audio';
import apiClient from './client';
import { makeIdempotencyKey } from './idempotency';

/**
 * Normalise a raw API word record to the canonical snake_case WordData shape.
 *
 * The curriculum JSON stored in R2 may use camelCase field names
 * (displayText, targetIpa, audioPath). The backend typically normalises these
 * to snake_case when writing the session blob, but historically some sessions
 * were stored with camelCase keys intact. This function guarantees downstream
 * code always receives snake_case fields regardless of what the API returns.
 */
function normalizeWordData(raw: Record<string, unknown>): WordData {
  const display_text =
    (raw['display_text'] as string | undefined) || (raw['displayText'] as string | undefined) || '';

  const target_ipa =
    (raw['target_ipa'] as string | undefined) ||
    (raw['targetIpa'] as string | undefined) ||
    (raw['targetIPA'] as string | undefined) ||
    undefined;

  const audio_path =
    (raw['audio_path'] as string | undefined) ||
    (raw['audioPath'] as string | undefined) ||
    undefined;

  // Extract validation — support nested object form or flat top-level keys (curriculum JSON)
  let validation: WordData['validation'];
  const rawValidation = raw['validation'] as
    | { confused?: string[]; feedback?: Record<string, string> }
    | undefined;
  if (rawValidation && (rawValidation.confused || rawValidation.feedback)) {
    validation = {
      confused: rawValidation.confused ?? [],
      feedback: rawValidation.feedback ?? {},
    };
  } else {
    const confused = raw['confused'] as string[] | undefined;
    const feedback = raw['feedback'] as Record<string, string> | undefined;
    if (confused || feedback) {
      validation = { confused: confused ?? [], feedback: feedback ?? {} };
    }
  }

  return {
    ...raw,
    id: (raw['id'] as string) || '',
    display_text,
    target_ipa,
    audio_path,
    validation,
  };
}

function normalizeSession(session: SessionData): SessionData {
  return {
    ...session,
    wordData: session.wordData.map((w) =>
      normalizeWordData(w as unknown as Record<string, unknown>),
    ),
  };
}

/**
 * Resolve `audio_path` for any words that only carry an `audio_files` array
 * (curriculum JSON format). Calls `/v1/audio/sounds-resolve` once per word that
 * needs resolution. All calls are made in parallel and failures are silently
 * swallowed so a single unresolvable word doesn't block the whole lesson.
 */
export async function resolveSessionAudioPaths(session: SessionData): Promise<SessionData> {
  const results = await Promise.allSettled(
    session.wordData.map(async (word) => {
      if (word.audio_path) return word;
      // audio_files comes in two shapes depending on curriculum source:
      //   (A) Array<{ipa, role}>  — newer curriculum JSON with role hints
      //   (B) Array<string>       — older modules store raw IPA strings (e.g. ["/kæt/","/k/"])
      // Normalize to shape (A) before any role-based filtering. The first entry in shape (B)
      // is treated as primary by convention.
      const rawFiles = word['audio_files'] as
        | Array<{ ipa: string; role: string } | string>
        | undefined;
      if (!rawFiles?.length) return word;
      const audioFiles = rawFiles.map((entry, idx) =>
        typeof entry === 'string'
          ? { ipa: entry, role: idx === 0 ? 'primary:pure' : 'phoneme' }
          : entry,
      );
      // Prefer "primary:pure" over "primary:schwa" — simpler IPA is more likely to resolve.
      const primary =
        audioFiles.find((f) => f.role === 'primary:pure') ??
        audioFiles.find((f) => f.role?.startsWith('primary')) ??
        audioFiles[0];
      // Build candidate list: with slashes first, then without (e.g. "/m/" → "m")
      const stripSlashes = (ipa: string) => ipa.replace(/\//g, '');
      const unique = [primary, ...audioFiles.filter((f) => f !== primary)];
      const candidates = [
        ...unique,
        ...unique
          .map((f) => ({ ...f, ipa: stripSlashes(f.ipa) }))
          .filter((f) => f.ipa !== primary.ipa),
      ];
      for (const candidate of candidates) {
        try {
          const resolved = await resolveSounds(candidate.ipa);
          if (resolved.resolved) {
            // Priority: publicUrls[0] → publicUrl → getAudioProxyUrl(path) → legacy audioPath
            let audioUrl: string | undefined;
            let urlField: string | undefined;
            if (resolved.publicUrls?.[0]) {
              audioUrl = resolved.publicUrls[0];
              urlField = 'publicUrls[0]';
            } else if (resolved.publicUrl) {
              audioUrl = resolved.publicUrl;
              urlField = 'publicUrl';
            } else if (resolved.path) {
              audioUrl = getAudioProxyUrl(resolved.path);
              urlField = 'path (proxy)';
            } else if (resolved.audioPath) {
              audioUrl = getAudioProxyUrl(resolved.audioPath);
              urlField = 'audioPath (legacy)';
            }
            if (audioUrl) {
              console.log(
                '[Modules] resolved audio for',
                word.id,
                '→',
                audioUrl,
                `(ipa: ${candidate.ipa}, via: ${urlField ?? 'unknown'})`,
              );
              return { ...word, audio_path: audioUrl };
            }
          }
          console.warn(
            '[Modules] resolveSounds resolved:false for',
            word.id,
            'ipa:',
            candidate.ipa,
          );
        } catch (err) {
          console.warn('[Modules] resolveSounds threw for', word.id, 'ipa:', candidate.ipa, err);
        }
      }
      console.warn(
        '[Modules] all candidates exhausted for',
        word.id,
        '— no audio available. Backend sounds database may not be populated.',
      );
      return word;
    }),
  );
  return {
    ...session,
    wordData: results.map((r, i) => (r.status === 'fulfilled' ? r.value : session.wordData[i])),
  };
}

export async function getMissions(profileId: string, force = false): Promise<Mission[]> {
  const key = `cache:missions:${profileId}`;
  if (force) {
    await clearCache(key);
  }
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
    const normalized = normalizeSession(data);
    await setCache(key, normalized, MODULE_CACHE_TTL);
    return normalized;
  } catch (err) {
    const stale = await getCacheEntry<SessionData>(key);
    if (stale) return normalizeSession(stale.data);
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
    { headers: { 'X-Idempotency-Key': makeIdempotencyKey() } },
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
