/**
 * Physical media decision engine (L1). Decides the transmission medium and
 * transceiver per link, validates physical-distance constraints, and returns
 * engineering rationale + warnings + compatibility issues.
 *
 * Boundary respected: NO Cisco configuration generation in this module.
 */
import type {
  MediaEngine,
  MediaRecommendation,
  MediaQuery,
  PhysicalDistanceVerdict,
  TransceiverSpec,
} from "../../contracts/media.js";
import { ExplainRecord } from "../../contracts/explain.js";
import {
  PhysicalDistanceViolationError,
  ReachabilityError,
  ValidationError,
} from "../../contracts/errors.js";
import { OM4_POLICY_MAX_METERS, selectPolicyMedium } from "./rules.js";
import {
  TransceiverCatalog,
  defaultTransceiverCatalog,
  TransceiverCatalogEntry,
} from "./transceivers.js";

export { UnsupportedTransceiverError } from "./transceivers.js";

/** Validate the numeric run length once, with explicit units and bounds. */
function assertDistance(runMeters: unknown): number {
  if (typeof runMeters !== "number" || !Number.isFinite(runMeters)) {
    throw new ValidationError(
      `Media engine: runMeters must be a finite number in meters (got ${String(runMeters)}).`,
    );
  }
  if (runMeters < 0) {
    throw new ValidationError(
      `Media engine: negative physical distance ${runMeters} m is impossible; supply a run length ≥ 0.`,
    );
  }
  return runMeters;
}

function assertBandwidth(bandwidth: unknown): number | undefined {
  if (bandwidth === undefined) return undefined;
  if (typeof bandwidth !== "number" || !Number.isFinite(bandwidth) || bandwidth <= 0) {
    throw new ValidationError(
      `Media engine: requiredBandwidthGbps must be a positive finite number in Gbps (got ${String(bandwidth)}).`,
    );
  }
  return bandwidth;
}

/** Build a stable ExplainRecord for the module. */
function explain(
  id: string,
  rule: string,
  decision: string,
  rationale: string,
  inputs: Record<string, unknown>,
  references: string[],
): ExplainRecord {
  return { id, module: "media", rule, decision, rationale, inputs, references };
}

/**
 * Recommend the medium + transceiver for one link.
 * Raises ValidationError (bad input), PhysicalDistanceViolationError
 * (copper > 100 m — assignment mandate), ReachabilityError (no catalog optic
 * can carry the run) or UnsupportedTransceiverError (pinned unknown id).
 */
export function recommendMedia(
  query: MediaQuery,
  catalog: TransceiverCatalog = defaultTransceiverCatalog(),
): MediaRecommendation {
  const runMeters = assertDistance(query.runMeters);
  const bandwidth = assertBandwidth(query.requiredBandwidthGbps);

  const linkId = query.linkId ?? "unspecified";
  const rationale: string[] = [];
  const warnings: string[] = [];
  const compatibilityIssues: string[] = [];
  const explanations: ExplainRecord[] = [];

  if (bandwidth === undefined) {
    warnings.push(
      "No bandwidth requirement supplied: the distance policy alone governs this decision (assignment baseline is 10 Gbps class).",
    );
  } else if (bandwidth > 10) {
    compatibilityIssues.push(
      `Requested ${bandwidth} Gbps exceeds the 10 Gbps class of every transceiver in the assignment catalog; the 10 Gbps recommendation below will not carry this demand.`,
    );
  }

  /* Copper-violation fast path — the assignment mandates this error by name. */
  if (query.requestedMedium === "cat6a" && runMeters > 100) {
    throw new PhysicalDistanceViolationError(
      runMeters,
      "cat6a",
      `Any copper tier stops at 100 m; fiber is required (OM4 ≤ ${OM4_POLICY_MAX_METERS} m per the backbone policy, OS2 beyond).`,
    );
  }
  if (runMeters > 100) {
    rationale.push("Link distance exceeds the copper Ethernet limit.");
  }

  /* Pinned transceiver must exist and must physically reach the run. */
  let pinned: TransceiverCatalogEntry | undefined;
  if (query.requestedTransceiver !== undefined) {
    pinned = catalog.get(query.requestedTransceiver); // throws UnsupportedTransceiverError
    if (runMeters > pinned.maxReachMeters) {
      throw new ReachabilityError(runMeters, pinned.maxReachMeters);
    }
    const policyMedium = selectPolicyMedium(runMeters).medium;
    if (pinned.medium !== policyMedium) {
      compatibilityIssues.push(
        `Pinned ${pinned.id} deviates from the distance policy (${policyMedium}); honored because it still physically reaches ${runMeters} m (catalog cap ${pinned.maxReachMeters} m at ${pinned.standard}).`,
      );
    }
  } else if (query.requestedMedium !== undefined) {
    /* Medium pinned without transceiver: physically impossible pins fail loudly. */
    const reachError = (medium: string): ReachabilityError =>
      new Error(
        `Requested medium ${medium} has no catalog optic able to reach ${runMeters} m; refusing per contract.`,
      ) as never;
    const reachOf = (medium: string): number | undefined => {
      let best: number | undefined;
      for (const entry of catalog.all()) {
        if (entry.medium === medium) best = Math.max(best ?? 0, entry.maxReachMeters);
      }
      return best;
    };
    if (runMeters > (reachOf(query.requestedMedium) ?? 0)) {
      throw new ReachabilityError(runMeters, reachOf(query.requestedMedium) ?? 0);
    }
    if (query.requestedMedium === "om4" && runMeters > OM4_POLICY_MAX_METERS) {
      compatibilityIssues.push(
        `OM4 was pinned for a ${runMeters} m run: the distance policy routes runs beyond ${OM4_POLICY_MAX_METERS} m to OS2, and a ${runMeters} m OM4 plant is outside the assignment rule table — treat this as an engineering exception, not a default.`,
      );
    }
    warnings.push(
      `Requested medium ${query.requestedMedium} honored within catalog reach; policy would otherwise select ${selectPolicyMedium(runMeters).medium}.`,
    );
    void reachError;
  }

  /* Distance policy decides DEFAULT medium; pinned transceiver overrides medium. */
  const policy = selectPolicyMedium(runMeters);
  let medium = pinned?.medium ?? (query.requestedMedium ?? policy.medium);
  let chosen: TransceiverCatalogEntry;

  if (pinned) {
    chosen = pinned;
    medium = pinned.medium;
    explanations.push(
      explain(
        `MEDIA.PINNED-${pinned.id}-${linkId}`,
        "MEDIA.PINNED-TRANSCEIVER",
        `Using pinned transceiver ${pinned.id} (${pinned.label})`,
        pinned.finePrint,
        { linkId, runMeters, pinnedId: pinned.id },
        ["IEEE 802.3"],
      ),
    );
  } else if (medium === "cat6a") {
    chosen = requireEntry(catalog, "cat6a", "10GBASE-T");
    explanations.push(
      explain(
        `MEDIA.COPPER-${linkId}`,
        "MEDIA.RULE-1-COPPER-100M",
        `Cat6a copper / 10GBASE-T for the ${runMeters} m run`,
        `Assignment rule table: runs up to and including 100 m stay on Cat6a twisted pair. ${chosen.finePrint}`,
        { linkId, runMeters, boundary: "≤ 100 m inclusive" },
        ["IEEE 802.3an"],
      ),
    );
  } else if (medium === "om4") {
    chosen = requireEntry(catalog, "om4", "10GBASE-SR");
    if (runMeters > chosen.maxReachMeters) {
      throw new ReachabilityError(runMeters, chosen.maxReachMeters);
    }
    rationale.push("OM4 is selected under the assignment's backbone policy.");
    explanations.push(
      explain(
        `MEDIA.OM4-${linkId}`,
        "MEDIA.RULE-2-OM4-400M",
        `OM4 MMF / 10GBASE-SR for the ${runMeters} m run`,
        `Assignment rule table directs the 101–400 m band to OM4 multimode fiber. ${chosen.finePrint}`,
        { linkId, runMeters, boundary: "100 m < run ≤ 400 m" },
        ["IEEE 802.3ae"],
      ),
    );
    warnings.push(
      `Catalog reach for ${chosen.id} is ${chosen.maxReachMeters} m AT 10GBASE-SR ONLY — OM4 does not support ${chosen.maxReachMeters} m at every Ethernet speed; re-validate reach if the link speed ever rises above 10 Gbps.`,
    );
  } else {
    /* OS2: pick LR or ER by actual run against per-transceiver reach. */
    chosen =
      runMeters <= 10_000
        ? requireEntry(catalog, "os2", "10GBASE-LR")
        : requireEntry(catalog, "os2", "10GBASE-ER");
    if (runMeters > chosen.maxReachMeters) {
      throw new ReachabilityError(runMeters, chosen.maxReachMeters);
    }
    rationale.push("OS2 single-mode fiber is selected under the assignment's long-haul policy.");
    explanations.push(
      explain(
        `MEDIA.OS2-${linkId}`,
        "MEDIA.RULE-3-OS2-400M-PLUS",
        `OS2 SMF / ${chosen.standard} for the ${runMeters} m run`,
        `Assignment rule table routes runs beyond 400 m to OS2 single-mode fiber; ${chosen.standard} rated to ${chosen.maxReachMeters} m. ${chosen.finePrint}`,
        { linkId, runMeters, boundary: "> 400 m exclusive" },
        ["IEEE 802.3ae"],
      ),
    );
  }

  rationale.push(
    `Transceiver ${chosen.label} (${chosen.standard}) selected: ${runMeters} m is within its ${chosen.maxReachMeters} m catalog reach.`,
  );
  if (chosen.powerBudgetDb !== undefined) {
    explanations.push(
      explain(
        `MEDIA.BUDGET-${chosen.id}-${linkId}`,
        "MEDIA.LINK-BUDGET-NOTE",
        `Optical link budget ${chosen.powerBudgetDb} dB documented`,
        `Vendor-class power budget of ${chosen.powerBudgetDb} dB applies at ${chosen.wavelengthNm} nm; physical link-budget validation against plant loss remains an installation-time check.`,
        { linkId, wavelengthNm: chosen.wavelengthNm, powerBudgetDb: chosen.powerBudgetDb },
        ["IEEE 802.3ae"],
      ),
    );
  }

  return {
    chosen,
    rationale,
    warnings,
    compatibilityIssues,
    ...(query.linkId !== undefined ? { linkId: query.linkId } : {}),
    explanations,
  };
}

function requireEntry(
  catalog: TransceiverCatalog,
  medium: "cat6a" | "om4" | "os2",
  standard: string,
): TransceiverCatalogEntry {
  const entry = catalog.defaultFor(medium, standard as never);
  if (entry === undefined) {
    throw new ValidationError(
      `Media engine: catalog lacks a default ${medium} transceiver for ${standard}; register one via TransceiverCatalog.register().`,
    );
  }
  return entry;
}

/** MediaEngine contract shape (recommend + isViolation). */
export function createMediaEngine(
  catalog: TransceiverCatalog = defaultTransceiverCatalog(),
): MediaEngine {
  return {
    recommend: (query: MediaQuery) => recommendMedia(query, catalog),
    isViolation: (query: MediaQuery): PhysicalDistanceVerdict => {
      if (typeof query.runMeters === "number" && query.runMeters < 0) {
        return { violation: true, detail: "Negative distance is physically impossible." };
      }
      if (query.requestedMedium === "cat6a" && query.runMeters > 100) {
        return {
          violation: true,
          detail: `Copper run of ${query.runMeters} m exceeds the 100 m IEEE 802.3an limit (PhysicalDistanceViolationError if recommend() is invoked).`,
        };
      }
      return { violation: false, detail: "No physical-distance violation detected." };
    },
  };
}
