/**
 * Pure helpers for the fortune wheel geometry.
 *
 * Convention:
 * - Segments are drawn starting at canvas angle 0 (positive x-axis) and go
 *   clockwise. Segment `i` covers [i * slice, (i + 1) * slice).
 * - The pointer sits at the top of the wheel (canvas angle 270° = -y).
 * - `rotation` (degrees) rotates the whole wheel clockwise.
 * - Positive rotation is applied AFTER the drawing, so a segment initially at
 *   angle `a` ends up at `(a + rotation) mod 360`.
 */

const POINTER_ANGLE_DEG = 270;

const mod360 = (v: number) => ((v % 360) + 360) % 360;

/** Angle (in wheel-local coordinates) of the center of segment `i`. */
export const segmentCenterAngle = (index: number, total: number): number => {
  if (total <= 0) throw new Error("total must be > 0");
  const slice = 360 / total;
  return index * slice + slice / 2;
};

/**
 * Rotation delta (relative to `currentRotation`) that lands the given
 * segment's CENTER under the top pointer.
 */
export const computeTargetRotation = (
  prizeIndex: number,
  total: number,
  currentRotation: number,
  extraFullSpins = 6,
): number => {
  const target = mod360(POINTER_ANGLE_DEG - segmentCenterAngle(prizeIndex, total));
  const currentMod = mod360(currentRotation);
  const delta = mod360(target - currentMod);
  return currentRotation + extraFullSpins * 360 + delta;
};

/**
 * Given a final rotation, return the segment index that sits under the
 * pointer. Inverse of {@link computeTargetRotation}.
 */
export const segmentUnderPointer = (rotation: number, total: number): number => {
  if (total <= 0) throw new Error("total must be > 0");
  const slice = 360 / total;
  // The point on the wheel currently under the pointer is at angle
  // (POINTER_ANGLE_DEG - rotation) in the wheel's local frame.
  const localAngle = mod360(POINTER_ANGLE_DEG - rotation);
  return Math.floor(localAngle / slice) % total;
};
