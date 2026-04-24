/**
 * Generate an opaque, sufficiently-unique key for the `X-Idempotency-Key`
 * header. The Tutoria backend uses this to dedupe replays of `POST` requests
 * (e.g. when the offline queue resyncs after a network blip), so two distinct
 * attempts at the same word must produce two distinct keys.
 *
 * Not a cryptographic UUID — `Math.random` is fine because the key only needs
 * to be unique within a short server-side dedupe window.
 */
export function makeIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
