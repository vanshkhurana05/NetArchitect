import { describe, it, expect } from "vitest";
import { createExplainCollector } from "../../../src/explain/index.js";
import type { ExplainRecord } from "../../../src/contracts/explain.js";

describe("ExplainCollector", () => {
  it("initializes empty and records records immutably", () => {
    const collector = createExplainCollector();
    expect(collector.log.records).toEqual([]);

    const record: ExplainRecord = {
      id: "MEDIA.OM4-400M",
      module: "media",
      rule: "MEDIA.02",
      decision: "Selected OM4 MMF",
      rationale: "Run 250m exceeds 100m Cat6a limit but within 400m OM4 limit",
      inputs: { runMeters: 250 },
      references: ["IEEE 802.3ae"],
    };

    collector.push(record);
    expect(collector.log.records.length).toBe(1);
    expect(collector.log.records[0].id).toBe("MEDIA.OM4-400M");
  });

  it("merges logs from other engines", () => {
    const collector1 = createExplainCollector();
    const collector2 = createExplainCollector();

    collector1.push({
      id: "REC-1",
      module: "vlsm",
      rule: "VLSM.01",
      decision: "Allocated /24",
      rationale: "Satisfies 100 hosts",
      inputs: { hosts: 100 },
      references: ["RFC 1878"],
    });

    collector2.push({
      id: "REC-2",
      module: "routing",
      rule: "ROUTING.01",
      decision: "OSPF Area 0",
      rationale: "Single AS < 50 subnets",
      inputs: { subnets: 5 },
      references: ["RFC 2328"],
    });

    collector1.merge(collector2.log);
    expect(collector1.log.records.length).toBe(2);
    expect(collector1.log.records[1].id).toBe("REC-2");
  });

  it("renders markdown report with grouped modules and references", () => {
    const collector = createExplainCollector();
    collector.push({
      id: "MEDIA.CAT6A",
      module: "media",
      rule: "MEDIA.01",
      decision: "Recommend Cat6a",
      rationale: "Run <= 100m",
      inputs: { runMeters: 90 },
      references: ["IEEE 802.3an"],
    });

    const md = collector.renderMarkdown();
    expect(md).toContain("### Module: MEDIA");
    expect(md).toContain("#### [MEDIA.01] Recommend Cat6a");
    expect(md).toContain("IEEE 802.3an");
  });
});
