/**
 * Runnable physical media engine example.
 * Demonstrates: assignment rule-table decisions at every band boundary,
 * copper-distance violation, transceiver compatibility, catalog extensibility
 * and the explainability records.
 *
 * Usage: npm run example:media
 */
import {
  recommendMedia,
  createMediaEngine,
  defaultTransceiverCatalog,
} from "../src/engines/media/index.js";
import {
  PhysicalDistanceViolationError,
  ReachabilityError,
  ValidationError,
} from "../src/contracts/errors.js";

const role = "building-backbone";

function show(runMeters: number, extra: Record<string, unknown> = {}): void {
  const query = { role, runMeters, ...extra } as never;
  let rec;
  try {
    rec = recommendMedia(query);
  } catch (err) {
    console.log(
      `\n== ${runMeters} m -> REFUSED (${err instanceof Error ? err.name : String(err)}) ==`,
    );
    if (err instanceof Error) console.log(`  ✘ ${err.message}`);
    return;
  }
  const head = rec.linkId ? `[${rec.linkId}]` : "";
  console.log(
    `\n== ${head} ${runMeters} m -> ${rec.chosen.medium.toUpperCase()} / ${rec.chosen.standard}` +
      ` (transceiver: ${rec.chosen.label}) ==`,
  );
  for (const line of rec.rationale) console.log(`  • ${line}`);
  for (const w of rec.warnings) console.log(`  ⚠ warning: ${w}`);
  for (const c of rec.compatibilityIssues) console.log(`  ⚠ compatibility issue: ${c}`);
  for (const e of rec.explanations) {
    console.log(`  ℹ explain ${e.id} [${e.rule}] → ${e.decision}`);
    console.log(`      refs: ${e.references.join(", ")}`);
  }
}

console.log("=== Rule table boundaries (explicit threshold semantics) ===");
show(80); // 0–100 inclusive → Cat6a
show(100); // copper cap, still Cat6a
show(100.01); // first micrometre past copper → OM4
show(101, { requiredBandwidthGbps: 1, linkId: "link-01" }); // spec output example shape
show(400, { requiredBandwidthGbps: 10 }); // OM4 cap inclusive
show(400.01); // past the backbone threshold → OS2
show(15_000); // OS2 10GBASE-LR band
show(41_000); // OS2 10GBASE-ER band

console.log("\n=== Validation errors ===");
const cases: Array<[string, () => void]> = [
  [
    "negative distance",
    () => {
      try {
        recommendMedia({ role, runMeters: -5 } as never);
      } catch (err) {
        if (err instanceof ValidationError) console.log(`✔ ValidationError → ${err.message}`);
        else throw err;
      }
    },
  ],
  [
    "missing bandwidth (warning-only path)",
    () => {
      const rec = recommendMedia({ role, runMeters: 30 } as never);
      console.log(`✔ warning (not fatal) → ${rec.warnings[0]}`);
    },
  ],
  [
    "unsupported transceiver",
    () => {
      try {
        recommendMedia({ role, runMeters: 60, requestedTransceiver: "100g-zr" } as never);
      } catch (err) {
        if (err instanceof Error && /UNSUPPORTED_TRANSCEIVER/.test(err.message)) {
          console.log(`✔ Unsupported → ${err.message}`);
        } else throw err;
      }
    },
  ],
  [
    "copper beyond 100 m (assignment-mandated violation)",
    () => {
      const engine = createMediaEngine();
      console.log(
        `✔ isViolation (non-throwing) → ${JSON.stringify(
          engine.isViolation({ role, runMeters: 140, requestedMedium: "cat6a" } as never),
        )}`,
      );
      try {
        recommendMedia({ role, runMeters: 140, requestedMedium: "cat6a" } as never);
      } catch (err) {
        if (err instanceof PhysicalDistanceViolationError) {
          console.log(`✔ PhysicalDistanceViolationError → ${err.message}`);
        } else throw err;
      }
    },
  ],
  [
    "no optical standard can reach 41,000 m",
    () => {
      try {
        recommendMedia({ role: "wan", runMeters: 41_000 } as never);
      } catch (err) {
        if (err instanceof ReachabilityError) console.log(`✔ ReachabilityError → ${err.message}`);
        else throw err;
      }
    },
  ],
];
for (const [name, fn] of cases) {
  console.log(`\n-- ${name}`);
  fn();
}

console.log("\n=== Catalog extensibility ===");
const catalog = defaultTransceiverCatalog();
console.log(`Default catalog ids: ${catalog.ids().join(", ")}`);
