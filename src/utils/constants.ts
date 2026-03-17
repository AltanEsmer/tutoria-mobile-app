/**
 * App-wide constants
 */

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://api-dev.tutoria.ac';

export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

// NFC
export const NFC_TAG_PREFIX = 'tutoria:';
export const SUPPORTED_TAG_TECH = 'Ndef';

// Module session
export const MAX_MODULE_ATTEMPTS = 3;
export const COOLDOWN_HOURS = 12;
export const MASTERY_DAYS_REQUIRED = 3;

// Pronunciation
export const PRONUNCIATION_RATE_LIMIT = 5; // requests per 60 seconds
export const PRONUNCIATION_TIMEOUT_MS = 20_000;

// Cache TTLs (ms)
export const STAGES_CACHE_TTL = 60 * 60 * 1000; // 1 hour
export const MODULE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
