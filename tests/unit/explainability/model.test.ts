import { describe, it, expect } from "vitest";
import {
  fromExplainRecord,
  toExplainRecord,
  type EngineeringDecision,
} from "../../../src/explainability/model.js";
import type { ExplainRecord } from "../../../src/contracts/explain.js";

describe("Engineering Decision Model", () => {
  it("creates structured engineering decision with all mandatory metadata", () => {
    const decision: EngineeringDecision = {
      decisionId: "decision-001",
      ruleId: "MEDIA_COPPER_LIMIT",
      module: "media",
      selected: "CAT6A",
      inputs: {
        distanceMeters: 70,
      },
      rationale: ["The link is within the configured 100m copper Ethernet limit."],
      warnings: [],
      assumptions: ["Standard Cat6a unshielded twisted pair runs"],
      references: ["IEEE 802.3an 10GBASE-T"],
    };

    expect(decision.decisionId).toBe("decision-001");
    expect(decision.ruleId).toBe("MEDIA_COPPER_LIMIT");
    expect(decision.selected).toBe("CAT6A");
    expect(decision.inputs["distanceMeters"]).toBe(70);
    expect(decision.rationale[0]).toContain("100m copper Ethernet limit");
    expect(decision.references).toContain("IEEE 802.3an 10GBASE-T");
  });

  it("converts ExplainRecord to EngineeringDecision and preserves integrity", () => {
    const explainRecord: ExplainRecord = {
      id: "VLSM.01",
      module: "vlsm",
      rule: "VLSM.DESCENDING-SORT",
      decision: "Allocated subnets descending by host capacity",
      rationale: "Minimizes fragmentation and prevents address space starvation.",
      inputs: { subnetsCount: 5 },
      references: ["RFC 1878", "RFC 3021"],
    };

    const decision = fromExplainRecord(explainRecord, 1);
    expect(decision.decisionId).toBe("VLSM.01");
    expect(decision.ruleId).toBe("VLSM.DESCENDING-SORT");
    expect(decision.module).toBe("vlsm");
    expect(decision.rationale).toEqual(["Minimizes fragmentation and prevents address space starvation."]);
    expect(decision.references).toEqual(["RFC 1878", "RFC 3021"]);

    const backToRecord = toExplainRecord(decision);
    expect(backToRecord.id).toBe(explainRecord.id);
    expect(backToRecord.rule).toBe(explainRecord.rule);
    expect(backToRecord.decision).toBe(explainRecord.decision);
  });
});
