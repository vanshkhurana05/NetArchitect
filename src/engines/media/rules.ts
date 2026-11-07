/**
 * Assignment rule table — pure distance policy. SEPARATE from transceiver
 * physics (see transceivers.ts): this module encodes ONLY the assignment's
 * selection thresholds, with explicit inclusive/exclusive boundary semantics.
 *
 * Explicit threshold semantics (normative for every engine decision):
 *   run ≤ 100 m      → Cat6a copper  / 10GBASE-T   (100 m INCLUSIVE)
 *   100 m < run ≤ 400 m → OM4 MMF    / 10GBASE-SR  (400 m INCLUSIVE)
 *   run > 400 m      → OS2 SMF       / LR or ER    (400 m EXCLUSIVE)
 */

export const COPPER_MAX_METERS = 100;
export const OM4_POLICY_MAX_METERS = 400;

export type PolicyMedium = "cat6a" | "om4" | "os2";

export interface PolicyVerdict {
  medium: PolicyMedium;
  /** Governing rule line, e.g. "100 m < run ≤ 400 m". */
  range: string;
  /** Human sentence naming the exact boundary that fired. */
  boundaryNote: string;
}

/** Pure policy mapping — no I/O, no catalog knowledge, deterministic. */
export function selectPolicyMedium(runMeters: number): PolicyVerdict {
  if (runMeters <= COPPER_MAX_METERS) {
    return {
      medium: "cat6a",
      range: `0 m ≤ run ≤ ${COPPER_MAX_METERS} m (inclusive)`,
      boundaryNote: `Link distance ${runMeters} m is within the ${COPPER_MAX_METERS} m copper Ethernet limit.`,
    };
  }
  if (runMeters <= OM4_POLICY_MAX_METERS) {
    return {
      medium: "om4",
      range: `${COPPER_MAX_METERS} m < run ≤ ${OM4_POLICY_MAX_METERS} m (both bounds exclusive/inclusive as written)`,
      boundaryNote: `Link distance exceeds the copper Ethernet limit; ${runMeters} m also exceeds any copper tier.`,
    };
  }
  return {
    medium: "os2",
    range: `run > ${OM4_POLICY_MAX_METERS} m (exclusive)`,
    boundaryNote: `Link distance ${runMeters} m exceeds both the copper limit and the OM4 backbone threshold.`,
  };
}
