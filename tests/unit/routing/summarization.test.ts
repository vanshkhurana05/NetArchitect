import { describe, it, expect } from "vitest";
import {
  calculateRouteSummary,
  detectOverlappingSummaries,
} from "../../../src/engines/routing/summarization.js";
import { RoutingValidationError } from "../../../src/engines/routing/types.js";
import type { SubnetPlanItem } from "../../../src/contracts/vlsm.js";

describe("Route Summarization Utility", () => {
  function makeSubnet(name: string, network: string, prefix: number): SubnetPlanItem {
    return {
      name,
      index: 0,
      network,
      prefix,
      mask: "255.255.255.0",
      wildcard: "0.0.0.255",
      broadcast: "",
      firstHost: "",
      lastHost: "",
      gateway: "",
      totalAddresses: 256,
      requestedHosts: 50,
      capacity: 254,
      utilization: 0.2,
    };
  }

  it("calculates exact supernet CIDR for contiguous subnets", () => {
    // 10.0.0.0/24 and 10.0.1.0/24 -> 10.0.0.0/23
    const subnets = [
      makeSubnet("S1", "10.0.0.0", 24),
      makeSubnet("S2", "10.0.1.0", 24),
    ];

    const summary = calculateRouteSummary(subnets, 10);
    expect(summary.summaryCidr).toBe("10.0.0.0/23");
    expect(summary.baseNetwork).toBe("10.0.0.0");
    expect(summary.prefix).toBe(23);
    expect(summary.netmask).toBe("255.255.254.0");
    expect(summary.wildcard).toBe("0.0.1.255");
    expect(summary.areaId).toBe(10);
  });

  it("calculates supernet for 4 contiguous /24 subnets into a /22", () => {
    const subnets = [
      makeSubnet("S1", "10.10.0.0", 24),
      makeSubnet("S2", "10.10.1.0", 24),
      makeSubnet("S3", "10.10.2.0", 24),
      makeSubnet("S4", "10.10.3.0", 24),
    ];

    const summary = calculateRouteSummary(subnets);
    expect(summary.summaryCidr).toBe("10.10.0.0/22");
    expect(summary.prefix).toBe(22);
  });

  it("returns original subnet CIDR for single-item list", () => {
    const subnets = [makeSubnet("S1", "192.168.10.0", 24)];
    const summary = calculateRouteSummary(subnets);
    expect(summary.summaryCidr).toBe("192.168.10.0/24");
  });

  it("rejects empty subnet list", () => {
    expect(() => calculateRouteSummary([])).toThrow(RoutingValidationError);
  });

  describe("Overlapping Route Summary Detection", () => {
    it("detects when two route summaries overlap in IP space", () => {
      const summaries = [
        {
          summaryCidr: "10.0.0.0/23", // covers 10.0.0.0 - 10.0.1.255
          baseNetwork: "10.0.0.0",
          prefix: 23,
          netmask: "255.255.254.0",
          wildcard: "0.0.1.255",
          encompassedSubnets: ["S1", "S2"],
          areaId: 10,
        },
        {
          summaryCidr: "10.0.1.0/24", // enclosed inside 10.0.0.0/23!
          baseNetwork: "10.0.1.0",
          prefix: 24,
          netmask: "255.255.255.0",
          wildcard: "0.0.0.255",
          encompassedSubnets: ["S3"],
          areaId: 20,
        },
      ];

      const overlapCheck = detectOverlappingSummaries(summaries);
      expect(overlapCheck.hasOverlap).toBe(true);
      expect(overlapCheck.overlappingPairs.length).toBe(1);
      expect(overlapCheck.overlappingPairs[0]?.detail).toContain("overlaps with");
    });

    it("verifies non-overlapping route summaries pass check", () => {
      const summaries = [
        {
          summaryCidr: "10.0.0.0/24",
          baseNetwork: "10.0.0.0",
          prefix: 24,
          netmask: "255.255.255.0",
          wildcard: "0.0.0.255",
          encompassedSubnets: ["S1"],
          areaId: 10,
        },
        {
          summaryCidr: "10.0.1.0/24",
          baseNetwork: "10.0.1.0",
          prefix: 24,
          netmask: "255.255.255.0",
          wildcard: "0.0.0.255",
          encompassedSubnets: ["S2"],
          areaId: 20,
        },
      ];

      const overlapCheck = detectOverlappingSummaries(summaries);
      expect(overlapCheck.hasOverlap).toBe(false);
      expect(overlapCheck.overlappingPairs).toEqual([]);
    });
  });
});
