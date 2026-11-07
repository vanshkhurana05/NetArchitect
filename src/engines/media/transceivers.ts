/**
 * Physical transceiver catalog — mode 2 of the media engine.
 *
 * DECISIVE DESIGN SPLIT: the assignment's distance POLICY (rules.ts) answers
 * "which medium does the rule table pick?"; THIS catalog answers "can a real
 * transceiver optic actually carry the run at a given Ethernet speed?".
 * Reach lives per (medium, standard, speed) so we never assume e.g. that an
 * OM4 plant supports 400 m at every Ethernet speed — 400 m is the 10GBASE-SR
 * figure only; faster SR-class optics derate OM4 reach substantially.
 *
 * Extensibility: engines receive any TransceiverCatalog instance; additional
 * entries (higher speeds, vendor optics, DACs) plug in via register() without
 * touching engine logic.
 */
import type { EthernetStandard, Medium, TransceiverSpec } from "../../contracts/media.js";

/** Engine-scoped failure when a caller pins an unknown transceiver id. (Engine-local, not a shared-contract type.) */
export class UnsupportedTransceiverError extends Error {
  public readonly code = "UNSUPPORTED_TRANSCEIVER";
  constructor(public readonly requestedId: string, supported: string[]) {
    super(
      `UNSUPPORTED_TRANSCEIVER: "${requestedId}" is not in the transceiver catalog (supported: ${supported.join(", ")}).`,
    );
    this.name = "UnsupportedTransceiverError";
  }
}

export interface TransceiverCatalogEntry extends TransceiverSpec {
  /** Stable catalog id callers may pin via MediaQuery.requestedTransceiver. */
  id: string;
  /** Short human-facing identifier, e.g. "850nm-SR". */
  label: string;
  /** Physics fine-print the engine surfaces in warnings/explanations. */
  finePrint: string;
}

export class TransceiverCatalog {
  private readonly entries = new Map<string, TransceiverCatalogEntry>();

  register(entry: TransceiverCatalogEntry): this {
    if (this.entries.has(entry.id)) {
      throw new Error(`DUPLICATE_TRANSCEIVER_ID: "${entry.id}" is already registered.`);
    }
    this.entries.set(entry.id, entry);
    return this;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** Throws UnsupportedTransceiverError for unknown ids (spec boundary case). */
  get(id: string): TransceiverCatalogEntry {
    const entry = this.entries.get(id);
    if (entry === undefined) {
      throw new UnsupportedTransceiverError(id, this.ids());
    }
    return entry;
  }

  /** Entries carrying a given medium at a given Ethernet standard by default. */
  defaultFor(medium: Medium, standard: EthernetStandard): TransceiverCatalogEntry | undefined {
    for (const entry of this.entries.values()) {
      if (entry.medium === medium && entry.standard === standard) return entry;
    }
    return undefined;
  }

  ids(): string[] {
    return [...this.entries.keys()];
  }

  all(): TransceiverCatalogEntry[] {
    return [...this.entries.values()];
  }
}

/**
 * The assignment's default optic plant. Reach figures are the IEEE 802.3
 * clause maxima for the listed standard ONLY:
 *  - 10GBASE-T over Cat6a:        100 m  (802.3an clause)
 *  - 10GBASE-SR 850 nm over OM4:  400 m  (NOT valid for 40/100G SR4 on OM4)
 *  - 10GBASE-LR 1310 nm over OS2: 10 km
 *  - 10GBASE-ER 1550 nm over OS2: 40 km
 */
export function defaultTransceiverCatalog(): TransceiverCatalog {
  const catalog = new TransceiverCatalog()
    .register({
      id: "cat6a-10gt",
      label: "1000BASE/10G-T RJ45",
      medium: "cat6a",
      standard: "10GBASE-T",
      wavelengthNm: 0,
      maxReachMeters: 100,
      finePrint: "IEEE 802.3an: 10GBASE-T over Cat6a is capped at 100 m (inclusive). Copper runs beyond 100 m are a PhysicalDistanceViolationError by assignment mandate.",
    })
    .register({
      id: "om4-850sr",
      label: "850nm-SR",
      medium: "om4",
      standard: "10GBASE-SR",
      wavelengthNm: 850,
      maxReachMeters: 400,
      powerBudgetDb: 7.3,
      finePrint: "IEEE 802.3ae: the 400 m OM4 reach is a 10GBASE-SR @ 850 nm figure. Do not reuse it at other Ethernet speeds — SR-class optics derate OM4 reach as speed rises.",
    })
    .register({
      id: "os2-1310lr",
      label: "1310nm-LR",
      medium: "os2",
      standard: "10GBASE-LR",
      wavelengthNm: 1310,
      maxReachMeters: 10_000,
      powerBudgetDb: 10.0,
      finePrint: "IEEE 802.3ae: 10GBASE-LR over OS2 SMF reaches 10 km at 1310 nm.",
    })
    .register({
      id: "os2-1550er",
      label: "1550nm-ER",
      medium: "os2",
      standard: "10GBASE-ER",
      wavelengthNm: 1550,
      maxReachMeters: 40_000,
      powerBudgetDb: 15.0,
      finePrint: "IEEE 802.3ae: 10GBASE-ER over OS2 SMF reaches 40 km at 1550 nm for long-haul runs.",
    });
  return catalog;
}
