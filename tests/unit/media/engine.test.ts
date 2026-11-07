/**
 * Physical media engine — boundary tests.
 * Threshold semantics are explicit and inclusive/exclusive as written:
 *   0–100 m inclusive → Cat6a / 10GBASE-T
 *   >100 m to 400 m inclusive → OM4 / 10GBASE-SR
 *   >400 m → OS2 / 10GBASE-LR or ER
 * Every boundary case the assignment lists is covered verbatim.
 */
import { describe, it, expect } from "vitest";
import {
  recommendMedia,
  createMediaEngine,
  UnsupportedTransceiverError,
  TransceiverCatalog,
  selectPolicyMedium,
  defaultTransceiverCatalog,
} from "../../../src/engines/media/index.js";
import {
  PhysicalDistanceViolationError,
  ReachabilityError,
  ValidationError,
} from "../../../src/contracts/errors.js";

const q = (runMeters: number, extra: Record<string, unknown> = {}) =>
  ({ runMeters, role: "access", ...extra }) as never;

describe("assignment threshold boundaries", () => {
  it("0 m → Cat6a (no negative distance side effect)", () => {
    const rec = recommendMedia(q(0));
    expect(rec.chosen.medium).toBe("cat6a");
    expect(rec.chosen.standard).toBe("10GBASE-T");
  });

  it("100 m → Cat6a (copper limit INCLUSIVE)", () => {
    const rec = recommendMedia(q(100));
    expect(rec.chosen.medium).toBe("cat6a");
    expect(rec.warnings.some((w) => /No bandwidth requirement/.test(w))).toBe(true);
  });

  it("100.01 m → OM4 (first infinitesimal step over copper)", () => {
    const rec = recommendMedia(q(100.01));
    expect(rec.chosen.medium).toBe("om4");
    expect(rec.chosen.wavelengthNm).toBe(850);
    expect(rec.rationale).toContain("Link distance exceeds the copper Ethernet limit.");
    expect(rec.rationale).toContain("OM4 is selected under the assignment's backbone policy.");
  });

  it("101 m → OM4 (assignment's 101–400 band)", () => {
    const rec = recommendMedia(q(101));
    expect(rec.chosen.medium).toBe("om4");
    expect(rec.chosen.standard).toBe("10GBASE-SR");
  });

  it("400 m → OM4 (backbone threshold INCLUSIVE, and physically valid for 10GBASE-SR)", () => {
    const rec = recommendMedia(q(400));
    expect(rec.chosen.medium).toBe("om4");
    expect(rec.chosen.maxReachMeters).toBe(400);
  });

  it("400.01 m → OS2 10GBASE-LR (backbone threshold EXCLUSIVE)", () => {
    const rec = recommendMedia(q(400.01));
    expect(rec.chosen.medium).toBe("os2");
    expect(rec.chosen.standard).toBe("10GBASE-LR");
    expect(rec.rationale).toContain(
      "OS2 single-mode fiber is selected under the assignment's long-haul policy.",
    );
  });

  it("selectPolicyMedium agrees with the engine at every boundary probe", () => {
    for (const [d, expectMedium] of [
      [0, "cat6a"],
      [100, "cat6a"],
      [100.001, "om4"],
      [101, "om4"],
      [400, "om4"],
      [400.001, "os2"],
    ] as const) {
      const v = selectPolicyMedium(d);
      expect(`${d}:${v.medium}`).toBe(`${d}:${expectMedium}`);
    }
  });
});

describe("physical-distance validation", () => {
  it("negative distance → ValidationError", () => {
    expect(() => recommendMedia(q(-0.001))).toThrow(ValidationError);
    expect(() => recommendMedia(q(-400))).toThrow(ValidationError);
  });

  it("copper explicitly requested beyond 100 m → PhysicalDistanceViolationError (assignment mandate)", () => {
    expect(() => recommendMedia(q(150, { requestedMedium: "cat6a" }))).toThrow(
      PhysicalDistanceViolationError,
    );
    expect(() => recommendMedia(q(10_000, { requestedMedium: "cat6a" }))).toThrow(
      PhysicalDistanceViolationError,
    );
  });

  it("isViolation() reports copper>100 m without raising", () => {
    const engine = createMediaEngine();
    expect(engine.isViolation(q(100, { requestedMedium: "cat6a" })).violation).toBe(false);
    expect(engine.isViolation(q(120, { requestedMedium: "cat6a" })).violation).toBe(true);
    expect(engine.isViolation(q(500, { requestedMedium: "os2" })).violation).toBe(false);
  });

  it("non-finite and non-numeric distances are rejected", () => {
    expect(() => recommendMedia(q(Number.NaN))).toThrow(ValidationError);
    expect(() => recommendMedia({ runMeters: "500" as never, role: "access" })).toThrow(
      ValidationError,
    );
  });

  it("zero/negative/garbage bandwidth is rejected; missing bandwidth only warns", () => {
    expect(() => recommendMedia(q(50, { requiredBandwidthGbps: 0 }))).toThrow(ValidationError);
    expect(() => recommendMedia(q(50, { requiredBandwidthGbps: -2 }))).toThrow(ValidationError);
    expect(() =>
      recommendMedia({ runMeters: 50, role: "access", requiredBandwidthGbps: undefined }),
    ).not.toThrow();
  });
});

describe("bandwidth + transceiver compatibility", () => {
  it("missing bandwidth → warning, decision still made", () => {
    const rec = recommendMedia(q(25));
    expect(rec.warnings).toHaveLength(1);
    expect(rec.warnings[0]).toMatch(/No bandwidth requirement/);
    expect(rec.chosen.medium).toBe("cat6a");
  });

  it("supplied bandwidth within 10 Gbps class produces no warning", () => {
    const rec = recommendMedia(q(25, { requiredBandwidthGbps: 10 }));
    expect(rec.warnings).toEqual([]);
  });

  it("bandwidth beyond the 10 Gbps class → compatibility issue", () => {
    const rec = recommendMedia(q(300, { requiredBandwidthGbps: 25 }));
    expect(rec.compatibilityIssues[0]).toMatch(/exceeds the 10 Gbps class/);
  });

  it("unsupported transceiver → UnsupportedTransceiverError naming supported ids", () => {
    expect(() => recommendMedia(q(50, { requestedTransceiver: "100g-zr-pluggable" }))).toThrow(
      UnsupportedTransceiverError,
    );
    try {
      recommendMedia(q(50, { requestedTransceiver: "100g-zr-pluggable" }));
    } catch (err) {
      expect((err as UnsupportedTransceiverError).message).toMatch(/cat6a-10gt/);
    }
  });

  it("pinned transceiver that cannot reach the run → ReachabilityError", () => {
    expect(() => recommendMedia(q(200, { requestedTransceiver: "cat6a-10gt" }))).toThrow(
      ReachabilityError,
    );
  });

  it("pinned transceiver honoring policy medium and reach → clean recommendation", () => {
    const rec = recommendMedia(q(300, { requestedTransceiver: "om4-850sr" }));
    expect(rec.chosen.id).toBe("om4-850sr");
    expect(rec.chosen.label).toBe("850nm-SR");
    expect(rec.compatibilityIssues).toEqual([]);
  });

  it("OM4 pinned beyond its physical reach → ReachabilityError (no blanket 400 m assumption)", () => {
    expect(() => recommendMedia(q(500, { requestedMedium: "om4" }))).toThrow(ReachabilityError);
  });

  it("run beyond every catalog optic → ReachabilityError with the best reach", () => {
    expect(() => recommendMedia(q(40_001))).toThrow(ReachabilityError);
    try {
      recommendMedia(q(40_001));
    } catch (err) {
      expect((err as ReachabilityError).message).toMatch(/40,?000/);
    }
  });
});

describe("engine plumbing & explainability", () => {
  it("echoes linkId only when supplied", () => {
    const withId = recommendMedia({ runMeters: 30, role: "access", linkId: "link-42" } as never);
    expect(withId.linkId).toBe("link-42");
    const without = recommendMedia(q(30));
    expect("linkId" in without).toBe(false);
  });

  it("every recommendation carries ExplainRecords with module=media and rule tags", () => {
    const rec = recommendMedia(q(300, { linkId: "link-01" }));
    expect(rec.explanations.length).toBeGreaterThan(0);
    for (const e of rec.explanations) {
      expect(e.module).toBe("media");
      expect(e.rule).toMatch(/^MEDIA\./);
      expect(e.decision.length).toBeGreaterThan(0);
      expect(e.rationale.length).toBeGreaterThan(0);
    }
    expect(rec.explanations.some((e) => e.rule === "MEDIA.RULE-2-OM4-400M")).toBe(true);
  });

  it("is deterministic: identical input → identical output", () => {
    const a = recommendMedia(q(389, { requiredBandwidthGbps: 2, linkId: "x" }));
    const b = recommendMedia(q(389, { requiredBandwidthGbps: 2, linkId: "x" }));
    expect(b).toEqual(a);
  });

  it("the catalog stays extensible: a custom optic plugs in without engine changes", () => {
    const custom = new TransceiverCatalog();
    custom.register({
      id: "os2-cwkm1600",
      label: "1600nm-ZR",
      medium: "os2",
      standard: "10GBASE-ER",
      wavelengthNm: 1600,
      maxReachMeters: 80_000,
      finePrint: "Hypothetical extended-reach optic for the extensibility test.",
    });
    // Seed the defaults too so the policy branch can resolve entries.
    for (const entry of defaultTransceiverCatalog().all()) custom.register({ ...entry });
    expect(recommendMedia(q(45_000), custom).chosen.id).toBe("os2-cwkm1600");
  });

  it("copper recommendation carries the 802.3an reference; optical carries 802.3ae", () => {
    expect(recommendMedia(q(80)).explanations.some((e) => e.references.includes("IEEE 802.3an"))).toBe(true);
    expect(recommendMedia(q(400)).explanations.some((e) => e.references.includes("IEEE 802.3ae"))).toBe(true);
    expect(recommendMedia(q(400.01)).explanations.some((e) => e.references.includes("IEEE 802.3ae"))).toBe(true);
  });
});
