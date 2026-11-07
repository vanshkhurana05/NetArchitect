import { describe, it, expect } from "vitest";
import {
  planBuildingDevices,
  planCampusDevices,
  DEFAULT_PLANNING_CONFIG,
} from "../../../src/engines/topology/device-planner.js";
import type { BuildingSpec } from "../../../src/contracts/input.js";

describe("Device Planner", () => {
  const buildingA: BuildingSpec = {
    id: "BLD-A",
    name: "Engineering",
    backboneRunMeters: 85,
    floors: 3,
    accessRunMeters: 90,
    endpoints: 620,
  };

  it("calculates access switches with 20% growth headroom and 4 reserved uplink ports", () => {
    // 620 * 1.2 = 744 ports needed.
    // 48 - 4 = 44 usable ports per switch.
    // ceil(744 / 44) = 17 switches.
    const plan = planBuildingDevices(buildingA);

    expect(plan.siteId).toBe("BLD-A");
    expect(plan.endpoints).toBe(620);
    expect(plan.totalAccessPortsNeeded).toBe(744);
    expect(plan.accessSwitchesCount).toBe(17);
    expect(plan.totalAccessPortsProvided).toBe(17 * 44);
    expect(plan.distributionSwitchesCount).toBe(1);
    expect(plan.apCount).toBe(Math.ceil(620 / 24)); // 26 APs
    expect(plan.poePortsNeeded).toBe(26);
    expect(plan.rationale.length).toBeGreaterThan(0);
  });

  it("allows overriding planning parameters (e.g. 24-port switches, 10% headroom)", () => {
    const customConfig = {
      accessSwitchPortCount: 24,
      reservedUplinkPorts: 2, // 22 usable ports
      growthHeadroomPct: 10, // 620 * 1.1 = 682 ports
      endpointsPerAp: 30, // ceil(620 / 30) = 21 APs
    };

    const plan = planBuildingDevices(buildingA, customConfig);
    expect(plan.totalAccessPortsNeeded).toBe(682);
    expect(plan.accessSwitchesCount).toBe(Math.ceil(682 / 22)); // 31 switches
    expect(plan.apCount).toBe(Math.ceil(620 / 30)); // 21 APs
  });

  it("plans devices across multiple campus buildings", () => {
    const buildings: BuildingSpec[] = [
      buildingA,
      {
        id: "BLD-B",
        name: "Library",
        backboneRunMeters: 190,
        floors: 4,
        accessRunMeters: 90,
        endpoints: 580,
      },
      {
        id: "BLD-C",
        name: "Admin",
        backboneRunMeters: 380,
        floors: 2,
        accessRunMeters: 88,
        endpoints: 400,
      },
    ];

    const plans = planCampusDevices(buildings);
    expect(plans.length).toBe(3);
    expect(plans[0]!.siteId).toBe("BLD-A");
    expect(plans[1]!.siteId).toBe("BLD-B");
    expect(plans[2]!.siteId).toBe("BLD-C");
  });
});
