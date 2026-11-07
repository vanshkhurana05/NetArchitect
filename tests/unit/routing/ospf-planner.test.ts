import { describe, it, expect } from "vitest";
import { planOspfAreas } from "../../../src/engines/routing/ospf-planner.js";
import { RoutingValidationError } from "../../../src/engines/routing/types.js";
import type { SubnetPlanItem } from "../../../src/contracts/vlsm.js";
import type { Device, Site } from "../../../src/contracts/topology.js";

describe("OSPF Area Planner", () => {
  const sites: Site[] = [
    { id: "HQ", label: "Headquarters", kind: "building", deviceIds: ["CORE-01"] },
    { id: "REMOTE-1", label: "Remote Branch 1", kind: "building", deviceIds: ["RTR-R1"] },
  ];

  const devices: Device[] = [
    { id: "CORE-01", name: "Campus Core", role: "core-switch", siteId: "HQ" },
    { id: "RTR-R1", name: "Branch Router", role: "edge-router", siteId: "REMOTE-1" },
  ];

  const subnets: SubnetPlanItem[] = [
    {
      name: "HQ-VLAN10",
      index: 0,
      network: "10.0.0.0",
      prefix: 24,
      mask: "255.255.255.0",
      wildcard: "0.0.0.255",
      broadcast: "10.0.0.255",
      firstHost: "10.0.0.1",
      lastHost: "10.0.0.254",
      gateway: "10.0.0.1",
      totalAddresses: 256,
      requestedHosts: 100,
      capacity: 254,
      utilization: 0.4,
    },
    {
      name: "REMOTE-1-VLAN20",
      index: 1,
      network: "10.0.1.0",
      prefix: 24,
      mask: "255.255.255.0",
      wildcard: "0.0.0.255",
      broadcast: "10.0.1.255",
      firstHost: "10.0.1.1",
      lastHost: "10.0.1.254",
      gateway: "10.0.1.1",
      totalAddresses: 256,
      requestedHosts: 50,
      capacity: 254,
      utilization: 0.2,
    },
  ];

  it("plans Single-Area OSPF with Area 0 and exact wildcard masks", () => {
    const areas = planOspfAreas("campus-lan", sites, devices, subnets, { multiArea: false });

    expect(areas.length).toBe(1);
    expect(areas[0]?.areaId).toBe(0);
    expect(areas[0]?.label).toContain("Area 0");
    expect(areas[0]?.networks).toEqual([
      { cidr: "10.0.0.0/24", wildcard: "0.0.0.255" },
      { cidr: "10.0.1.0/24", wildcard: "0.0.0.255" },
    ]);
  });

  it("plans Multi-Area OSPF with Area 0 for backbone and Area 10 for remote site", () => {
    const areas = planOspfAreas("metro-man", sites, devices, subnets, { multiArea: true });

    expect(areas.length).toBe(2);
    const area0 = areas.find((a) => a.areaId === 0);
    const area10 = areas.find((a) => a.areaId === 10);

    expect(area0).toBeDefined();
    expect(area10).toBeDefined();
    expect(area0?.networks[0]?.cidr).toBe("10.0.0.0/24");
    expect(area10?.networks[0]?.cidr).toBe("10.0.1.0/24");
    expect(area10?.summaryRoutes?.length).toBe(1);
    expect(area10?.summaryRoutes?.[0]?.summaryCidr).toBe("10.0.1.0/24");
  });

  describe("Boundary Failures & Error Handling", () => {
    it("rejects duplicate network advertisements in subnets", () => {
      const duplicateSubnets: SubnetPlanItem[] = [
        subnets[0]!,
        {
          ...subnets[1]!,
          network: "10.0.0.0", // Duplicate network IP!
          prefix: 24,
        },
      ];

      expect(() =>
        planOspfAreas("campus-lan", sites, devices, duplicateSubnets, { multiArea: false }),
      ).toThrow(RoutingValidationError);
    });

    it("rejects when topology has missing router interfaces / no L3 devices", () => {
      const noRouters: Device[] = [
        { id: "ACC-01", name: "Access Switch", role: "access-switch", siteId: "HQ" },
      ];

      expect(() =>
        planOspfAreas("campus-lan", sites, noRouters, subnets, { multiArea: false }),
      ).toThrow(RoutingValidationError);
    });

    it("rejects empty subnet list", () => {
      expect(() => planOspfAreas("campus-lan", sites, devices, [])).toThrow(RoutingValidationError);
    });
  });
});
