import { describe, it, expect } from "vitest";
import { runNetArch } from "../../../src/orchestrator/pipeline.js";
import { loadPreset } from "../../../src/profiles/index.js";

describe("Application Orchestrator Pipeline", () => {
  it("executes full pipeline with dryRun option", async () => {
    const runInput = await loadPreset("campus-lan");
    const report = await runNetArch(runInput, { dryRun: true });

    expect(report.scenario).toBe("campus");
    expect(report.stages.length).toBeGreaterThanOrEqual(7);
    expect(report.stages.every((s) => s.ok)).toBe(true);
    expect(report.rejections).toEqual([]);
    expect(report.verification?.passed).toBe(true);
    expect(report.configs?.length).toBe(49);
    // dryRun means no exports manifest
    expect(report.exports).toBeUndefined();
  });

  it("records timing per stage", async () => {
    const runInput = await loadPreset("metro-man");
    const report = await runNetArch(runInput, { dryRun: true });

    for (const stage of report.stages) {
      expect(typeof stage.name).toBe("string");
      expect(typeof stage.millis).toBe("number");
      expect(stage.millis).toBeGreaterThanOrEqual(0);
      expect(stage.ok).toBe(true);
    }
  });
});
