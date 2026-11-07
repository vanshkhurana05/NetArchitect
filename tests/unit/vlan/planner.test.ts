import { describe, it, expect } from "vitest";
import { planVlans } from "../../../src/engines/vlan/planner.js";
import type { VlanEngineInput } from "../../../src/contracts/vlan.js";

describe("VLAN Planner", () => {
  const sampleInput: VlanEngineInput = {
    requests: [
      { name: "MGMT", purpose: "management", hosts: 20 },
      { name: "STAFF", purpose: "staff", hosts: 650 },
      { name: "STUDENTS", purpose: "students", hosts: 850 },
      { name: "SERVERS", purpose: "servers", hosts: 60 },
      { name: "PRINTERS", purpose: "iot", hosts: 20 },
    ],
    siteIds: ["BLD-A", "BLD-B", "BLD-C"],
    devices: [
      { id: "CORE-01", name: "Core Switch 1", role: "core-switch", siteId: "SITE-CORE" },
      { id: "ACC-A-1", name: "Access Switch A1", role: "access-switch", siteId: "BLD-A", portCount: 48 },
    ],
    links: [
      {
        id: "LINK-CORE-ACC",
        aDeviceId: "CORE-01",
        bDeviceId: "ACC-A-1",
        kind: "physical",
        bandwidthMbps: 1000,
      },
    ],
  };

  it("assigns deterministic, unique VLAN IDs starting at 10 incrementing by 10", () => {
    const result = planVlans(sampleInput);

    expect(result.vlanPlan.items.map((i) => i.vlanId)).toEqual([10, 20, 30, 40, 50]);
    expect(result.vlanPlan.items.map((i) => i.name)).toEqual([
      "MGMT",
      "STAFF",
      "STUDENTS",
      "SERVERS",
      "PRINTERS",
    ]);
  });

  it("strictly avoids default VLAN 1 and native VLAN 99 for user VLAN allocation", () => {
    // If start is 90 and increment is 9, 99 would collide with native VLAN
    const result = planVlans(
      {
        requests: [
          { name: "DEPT1", purpose: "staff", hosts: 50 },
          { name: "DEPT2", purpose: "students", hosts: 50 },
        ],
        siteIds: ["SITE-1"],
      },
      { startVlanId: 98, increment: 1 },
    );

    const ids = result.vlanPlan.items.map((i) => i.vlanId);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(99);
  });

  it("plans trunks with allowed VLAN lists and hardened native VLAN 99", () => {
    const result = planVlans(sampleInput);

    expect(result.vlanPlan.trunks.length).toBe(1);
    const trunk = result.vlanPlan.trunks[0];
    expect(trunk?.linkId).toBe("LINK-CORE-ACC");
    expect(trunk?.nativeVlanId).toBe(99);
    expect(trunk?.allowedVlanIds).toEqual([10, 20, 30, 40, 50]);
  });

  it("plans SVIs for layer-3 devices (core switches / edge routers)", () => {
    const result = planVlans(sampleInput);

    const coreSvis = result.vlanPlan.svis.filter((s) => s.deviceId === "CORE-01");
    expect(coreSvis.length).toBe(5);
    expect(coreSvis.map((s) => s.vlanId)).toEqual([10, 20, 30, 40, 50]);
  });

  it("assigns access port blocks on access switches", () => {
    const result = planVlans(sampleInput);

    expect(result.accessPorts.length).toBeGreaterThan(0);
    const swPorts = result.accessPorts.filter((p) => p.deviceId === "ACC-A-1");
    expect(swPorts.length).toBe(4); // 4 client VLANs (MGMT excluded)
  });

  it("emits explainability records for 802.1Q tags and native VLAN hardening", () => {
    const result = planVlans(sampleInput);

    expect(result.vlanPlan.explanations.length).toBe(3);
    const nativeExp = result.vlanPlan.explanations.find((e) => e.rule === "VLAN.02");
    expect(nativeExp?.decision).toContain("Native VLAN 99");
    expect(nativeExp?.rationale).toContain("VLAN hopping");
  });
});
