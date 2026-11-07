import { describe, it, expect } from "vitest";
import { chooseRoutingProtocol, validateAsn } from "../../../src/engines/routing/protocol-chooser.js";
import { RoutingValidationError } from "../../../src/engines/routing/types.js";
import type { SubnetPlanItem } from "../../../src/contracts/vlsm.js";
import type { RoutingEngineInput } from "../../../src/contracts/routing.js";

/** Helper to generate dummy subnets for boundary testing */
function generateDummySubnets(count: number): SubnetPlanItem[] {
  const subnets: SubnetPlanItem[] = [];
  for (let i = 0; i < count; i++) {
    const thirdOctet = Math.floor(i / 256);
    const fourthOctet = i % 256;
    subnets.push({
      name: `SUBNET-${i}`,
      index: i,
      network: `10.0.${thirdOctet}.${fourthOctet}`,
      prefix: 24,
      mask: "255.255.255.0",
      wildcard: "0.0.0.255",
      broadcast: `10.0.${thirdOctet}.255`,
      firstHost: `10.0.${thirdOctet}.1`,
      lastHost: `10.0.${thirdOctet}.254`,
      gateway: `10.0.${thirdOctet}.1`,
      totalAddresses: 256,
      requestedHosts: 50,
      capacity: 254,
      utilization: 0.2,
    });
  }
  return subnets;
}

describe("Routing Protocol Chooser — Boundary Tests", () => {
  const baseInput: RoutingEngineInput = {
    profile: "campus-lan",
    asNumber: 65001,
    sites: [{ id: "SITE-CORE", label: "Campus MDF", kind: "building", deviceIds: ["CORE-01"] }],
    devices: [{ id: "CORE-01", name: "Core Switch", role: "core-switch", siteId: "SITE-CORE" }],
    subnets: [],
  };

  it("selects Single-Area OSPF when subnet count is exactly 49 (< 50)", () => {
    const input: RoutingEngineInput = {
      ...baseInput,
      subnets: generateDummySubnets(49),
    };

    const decision = chooseRoutingProtocol(input);
    expect(decision.protocol).toBe("single-area-ospf");
    expect(decision.explanation.rule).toBe("ROUTING.01");
    expect(decision.explanation.decision).toContain("Single-Area OSPF");
  });

  it("selects Multi-Area OSPF when subnet count is exactly 50 (>= 50 threshold)", () => {
    const input: RoutingEngineInput = {
      ...baseInput,
      subnets: generateDummySubnets(50),
    };

    const decision = chooseRoutingProtocol(input);
    expect(decision.protocol).toBe("multi-area-ospf");
    expect(decision.explanation.rule).toBe("ROUTING.02");
    expect(decision.explanation.rationale).toContain("meets or exceeds the single-area scalability limit");
  });

  it("selects Multi-Area OSPF when subnet count is 51 (> 50 threshold)", () => {
    const input: RoutingEngineInput = {
      ...baseInput,
      subnets: generateDummySubnets(51),
    };

    const decision = chooseRoutingProtocol(input);
    expect(decision.protocol).toBe("multi-area-ospf");
    expect(decision.explanation.rule).toBe("ROUTING.02");
  });

  it("selects OSPF-eBGP when connecting distinct autonomous systems (Cloud VPC)", () => {
    const input: RoutingEngineInput = {
      ...baseInput,
      profile: "global-wan",
      subnets: generateDummySubnets(10),
      cloudVpc: {
        provider: "aws",
        vpcCidr: "172.20.0.0/16",
        vpnPeerPublicIps: ["203.0.113.10"],
      },
    };

    const decision = chooseRoutingProtocol(input);
    expect(decision.protocol).toBe("ospf-ebgp");
    expect(decision.explanation.rule).toBe("ROUTING.03");
    expect(decision.explanation.references).toContain("RFC 4271 BGP-4");
  });

  it("does NOT select eBGP merely because multiple physical sites exist", () => {
    // Multi-site Metro MAN with a single AS
    const input: RoutingEngineInput = {
      ...baseInput,
      profile: "metro-man",
      sites: [
        { id: "HQ", label: "HQ", kind: "man-site", deviceIds: ["HQ-RTR"] },
        { id: "REMOTE-1", label: "Remote 1", kind: "man-site", deviceIds: ["R1-RTR"] },
        { id: "REMOTE-2", label: "Remote 2", kind: "man-site", deviceIds: ["R2-RTR"] },
      ],
      subnets: generateDummySubnets(10),
    };

    const decision = chooseRoutingProtocol(input);
    // Must be multi-area OSPF, NOT eBGP!
    expect(decision.protocol).toBe("multi-area-ospf");
    expect(decision.protocol).not.toBe("ospf-ebgp");
  });

  describe("AS Number Validation", () => {
    it("validates standard 16-bit and 32-bit AS numbers", () => {
      expect(() => validateAsn(65001)).not.toThrow();
      expect(() => validateAsn(1)).not.toThrow();
      expect(() => validateAsn(4_200_000_000)).not.toThrow();
      expect(() => validateAsn(4_294_967_295)).not.toThrow();
    });

    it("rejects invalid AS numbers: 0, negative, > 4294967295, float", () => {
      expect(() => validateAsn(0)).toThrow(RoutingValidationError);
      expect(() => validateAsn(-10)).toThrow(RoutingValidationError);
      expect(() => validateAsn(4_294_967_296)).toThrow(RoutingValidationError);
      expect(() => validateAsn(65001.5)).toThrow(RoutingValidationError);
      expect(() => validateAsn(NaN)).toThrow(RoutingValidationError);
    });
  });
});
