import { describe, it, expect } from "vitest";
import {
  computeTargetRotation,
  segmentCenterAngle,
  segmentUnderPointer,
} from "./wheelMath";

describe("wheelMath", () => {
  it("segmentCenterAngle splits circle evenly", () => {
    expect(segmentCenterAngle(0, 4)).toBe(45);
    expect(segmentCenterAngle(1, 4)).toBe(135);
    expect(segmentCenterAngle(3, 4)).toBe(315);
  });

  it("computeTargetRotation lands correct segment under pointer (all sizes)", () => {
    for (const total of [3, 4, 6, 8, 12]) {
      for (let i = 0; i < total; i++) {
        const finalRotation = computeTargetRotation(i, total, 0);
        expect(segmentUnderPointer(finalRotation, total)).toBe(i);
      }
    }
  });

  it("computeTargetRotation respects current rotation offset", () => {
    for (const start of [123, 987, -450]) {
      const total = 8;
      for (let i = 0; i < total; i++) {
        const finalRotation = computeTargetRotation(i, total, start);
        expect(segmentUnderPointer(finalRotation, total)).toBe(i);
        // Wheel must actually spin forward at least a few full turns.
        expect(finalRotation - start).toBeGreaterThan(5 * 360);
      }
    }
  });

  it("segmentUnderPointer is inverse across the boundary", () => {
    // Even without animation, if RPC picks segment k, the pre-calculated
    // rotation must resolve to the same k — this is the invariant that broke
    // when the client fetched prizes in a different order than the RPC.
    const total = 6;
    for (let i = 0; i < total; i++) {
      const rotation = computeTargetRotation(i, total, 0, 0); // no extra spins
      expect(segmentUnderPointer(rotation, total)).toBe(i);
    }
  });
});
