import { describe, it, expect } from "vitest";
import { createDecisionCollector } from "../../../src/explainability/collector.js";
import type { EngineeringDecision } from "../../../src/explainability/model.js";

describe("Decision Collector", () => {
  it("records and filters engineering decisions across multiple modules", () => {
    const collector = createDecisionCollector();

    const mediaDecision: EngineeringDecision = {
      decisionId: "DEC-001",
      ruleId: "MEDIA.02",
      module: "media",
      selected: "OM4 MMF",
      inputs: { runMeters: 250 },
      rationale: ["Run length of 250m is within the 400m limit of OM4 multimode fiber."],
      warnings: [],
      assumptions: [],
      references: ["IEEE 802.3ae"],
    };

    const routingDecision: EngineeringDecision = {
      decisionId: "DEC-002",
      ruleId: "ROUTING.01",
      module: "routing",
      selected: "Single-Area OSPF",
      inputs: { subnetCount: 5, asNumber: 65001 },
      rationale: ["Single AS with <50 subnets utilizes OSPF Area 0."],
      warnings: ["Monitor future growth if subnets approach 50."],
      assumptions: [],
      references: ["RFC 2328"],
    };

    collector.recordDecision(mediaDecision);
    collector.recordDecision(routingDecision);

    expect(collector.getDecisions().length).toBe(2);
    expect(collector.getDecisionsByModule("media").length).toBe(1);
    expect(collector.getDecisionsByModule("routing").length).toBe(1);

    const warnings = collector.getWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0]?.decisionId).toBe("DEC-002");
    expect(warnings[0]?.warning).toContain("Monitor future growth");
  });

  it("ingests ExplainLog objects seamlessly", () => {
    const collector = createDecisionCollector();

    collector.ingestExplainLog({
      records: [
        {
          id: "REC-1",
          module: "vlan",
          rule: "VLAN.01",
          decision: "Allocated VLAN 10",
          rationale: "Management broadcast domain",
          inputs: { vlanId: 10 },
          references: ["IEEE 802.1Q"],
        },
      ],
    });

    const decisions = collector.getDecisions();
    expect(decisions.length).toBe(1);
    expect(decisions[0]?.module).toBe("vlan");
    expect(decisions[0]?.ruleId).toBe("VLAN.01");

    const exportedJson = collector.exportJson();
    expect(exportedJson).toContain("VLAN.01");
  });
});
