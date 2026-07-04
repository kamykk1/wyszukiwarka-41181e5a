// Pure helpers for Fortune Wheel timing & privacy — extracted so they are unit-testable
// without mocking React, Supabase or timers.

/**
 * Compute the offset between the server clock and the browser clock.
 * Positive value means the server is ahead of the browser.
 * @param serverNowIso ISO timestamp returned by the RPC (server-side `now()`).
 * @param clientNowMs  Browser `Date.now()` captured near the same moment.
 */
export const computeServerOffsetMs = (serverNowIso: string | null | undefined, clientNowMs: number): number => {
  if (!serverNowIso) return 0;
  const t = Date.parse(serverNowIso);
  if (Number.isNaN(t)) return 0;
  return t - clientNowMs;
};

/**
 * "Server-corrected" now — the browser clock adjusted by the drift measured against the server.
 */
export const nowWithOffset = (offsetMs: number, clientNowMs: number = Date.now()): number =>
  clientNowMs + offsetMs;

/**
 * Given the last spin's created_at, return the unlock timestamp (ms since epoch).
 * The wheel unlocks exactly 24h after the last spin.
 */
export const computeUnlockAt = (createdAtIso: string | null | undefined): number | null => {
  if (!createdAtIso) return null;
  const t = Date.parse(createdAtIso);
  if (Number.isNaN(t)) return null;
  return t + 24 * 3_600_000;
};

/**
 * Resolve the definitive "next available at" using server data.
 * Prefers the explicit `next_available_at` from the RPC, falls back to
 * `last spin + 24h`.
 */
export const resolveNextAvailableAt = (
  nextAvailableAtIso: string | null | undefined,
  lastSpinIso: string | null | undefined,
): number | null => {
  if (nextAvailableAtIso) {
    const t = Date.parse(nextAvailableAtIso);
    if (!Number.isNaN(t)) return t;
  }
  return computeUnlockAt(lastSpinIso);
};

/**
 * Is the wheel unlocked right now, using server-corrected time?
 */
export const isUnlocked = (unlockAtMs: number | null, offsetMs: number = 0, clientNowMs: number = Date.now()): boolean => {
  if (unlockAtMs == null) return true;
  return nowWithOffset(offsetMs, clientNowMs) >= unlockAtMs;
};

/**
 * Format a positive duration (ms) as HH:MM:SS. Negative/zero → "00:00:00".
 */
export const formatRemaining = (unlockAtMs: number | null, offsetMs: number = 0, clientNowMs: number = Date.now()): string => {
  if (unlockAtMs == null) return "--:--:--";
  const diff = Math.max(0, unlockAtMs - nowWithOffset(offsetMs, clientNowMs));
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Privacy: reveal only the first 3 characters of a username; the rest becomes bullets.
 * Guaranteed to never leak the length precisely for very short handles (min 3 bullets).
 */
export const maskUsername = (raw: string | null | undefined): string => {
  const u = (raw ?? "").trim();
  if (!u) return "Anonim";
  const visible = u.slice(0, 3);
  const hiddenCount = Math.max(3, u.length - 3);
  return visible + "•".repeat(hiddenCount);
};
