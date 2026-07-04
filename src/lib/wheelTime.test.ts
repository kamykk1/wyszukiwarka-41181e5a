import { describe, it, expect } from "vitest";
import {
  computeServerOffsetMs,
  nowWithOffset,
  computeUnlockAt,
  resolveNextAvailableAt,
  isUnlocked,
  formatRemaining,
  maskUsername,
} from "./wheelTime";

describe("wheelTime — server clock offset", () => {
  it("returns 0 when RPC did not supply a server_now", () => {
    expect(computeServerOffsetMs(null, 1_000)).toBe(0);
    expect(computeServerOffsetMs(undefined, 1_000)).toBe(0);
  });

  it("returns 0 for an unparseable timestamp", () => {
    expect(computeServerOffsetMs("nope", 1_000)).toBe(0);
  });

  it("computes a positive offset when the server is ahead of the browser", () => {
    const server = "2026-07-04T22:00:10.000Z";
    const client = Date.parse("2026-07-04T22:00:00.000Z");
    expect(computeServerOffsetMs(server, client)).toBe(10_000);
  });

  it("computes a negative offset when the browser is ahead of the server", () => {
    const server = "2026-07-04T21:59:55.000Z";
    const client = Date.parse("2026-07-04T22:00:00.000Z");
    expect(computeServerOffsetMs(server, client)).toBe(-5_000);
  });

  it("nowWithOffset applies the offset to the browser clock", () => {
    expect(nowWithOffset(2_500, 1_000)).toBe(3_500);
    expect(nowWithOffset(-2_500, 1_000)).toBe(-1_500);
  });
});

describe("wheelTime — 24h unlock rule", () => {
  it("computes unlock = created_at + 24h", () => {
    const created = "2026-07-04T10:00:00.000Z";
    const unlock = computeUnlockAt(created);
    expect(unlock).toBe(Date.parse("2026-07-05T10:00:00.000Z"));
  });

  it("returns null for missing/invalid input", () => {
    expect(computeUnlockAt(null)).toBeNull();
    expect(computeUnlockAt(undefined)).toBeNull();
    expect(computeUnlockAt("garbage")).toBeNull();
  });

  it("prefers next_available_at from RPC over last_spin fallback", () => {
    const next = "2026-07-05T12:00:00.000Z";
    const last = "2026-07-04T10:00:00.000Z"; // +24h = 10:00, not 12:00
    expect(resolveNextAvailableAt(next, last)).toBe(Date.parse(next));
  });

  it("falls back to created_at + 24h when RPC did not return next_available_at", () => {
    const last = "2026-07-04T10:00:00.000Z";
    expect(resolveNextAvailableAt(null, last)).toBe(Date.parse("2026-07-05T10:00:00.000Z"));
  });

  it("returns null when neither is present", () => {
    expect(resolveNextAvailableAt(null, null)).toBeNull();
  });
});

describe("wheelTime — isUnlocked uses server-corrected clock", () => {
  const unlock = Date.parse("2026-07-05T10:00:00.000Z");

  it("is locked while server-corrected now < unlock", () => {
    const client = Date.parse("2026-07-05T09:59:59.000Z");
    expect(isUnlocked(unlock, 0, client)).toBe(false);
  });

  it("unlocks the moment server-corrected now hits unlock", () => {
    const client = Date.parse("2026-07-05T10:00:00.000Z");
    expect(isUnlocked(unlock, 0, client)).toBe(true);
  });

  it("browser clock 2h behind server → offset compensates and unlocks correctly", () => {
    // Browser thinks it's 08:00 but server is really at 10:00 → offset +2h.
    const client = Date.parse("2026-07-05T08:00:00.000Z");
    expect(isUnlocked(unlock, 2 * 3_600_000, client)).toBe(true);
    // Same browser time without offset would still be locked.
    expect(isUnlocked(unlock, 0, client)).toBe(false);
  });

  it("returns true when there is no unlock target (never spun)", () => {
    expect(isUnlocked(null, 0, 0)).toBe(true);
  });
});

describe("wheelTime — formatRemaining", () => {
  const unlock = Date.parse("2026-07-05T10:00:00.000Z");

  it("formats HH:MM:SS with leading zeros", () => {
    const client = Date.parse("2026-07-05T08:30:45.000Z");
    expect(formatRemaining(unlock, 0, client)).toBe("01:29:15");
  });

  it("clamps to 00:00:00 once unlocked", () => {
    const client = Date.parse("2026-07-05T11:00:00.000Z");
    expect(formatRemaining(unlock, 0, client)).toBe("00:00:00");
  });

  it("uses server offset when browser clock drifts", () => {
    // Browser thinks 09:00, server actually 09:30 → 30 min remaining.
    const client = Date.parse("2026-07-05T09:00:00.000Z");
    expect(formatRemaining(unlock, 30 * 60_000, client)).toBe("00:30:00");
  });

  it("returns placeholder when unlock is null", () => {
    expect(formatRemaining(null)).toBe("--:--:--");
  });
});

describe("wheelTime — maskUsername", () => {
  it("shows only first 3 chars, hides the rest with bullets", () => {
    expect(maskUsername("kowalski")).toBe("kow•••••");
  });

  it("guarantees at least 3 bullets for short usernames", () => {
    expect(maskUsername("ab")).toBe("ab•••");
    expect(maskUsername("abc")).toBe("abc•••");
  });

  it("does not reveal exact length for handles longer than 3 chars", () => {
    // 4-char handle would leak `+1 char` → we force min 3 bullets.
    expect(maskUsername("abcd")).toBe("abc•••");
    expect(maskUsername("abcde")).toBe("abc•••");
  });

  it("returns 'Anonim' for empty/nullish input", () => {
    expect(maskUsername(null)).toBe("Anonim");
    expect(maskUsername(undefined)).toBe("Anonim");
    expect(maskUsername("   ")).toBe("Anonim");
  });

  it("never contains any of the hidden characters after the visible prefix", () => {
    const raw = "supersecretname";
    const out = maskUsername(raw);
    expect(out.startsWith("sup")).toBe(true);
    expect(out.slice(3)).toMatch(/^•+$/);
    // Hidden part is bullets only — no leak of the remaining chars.
    expect(out).not.toContain("ersecretname");
  });
});
