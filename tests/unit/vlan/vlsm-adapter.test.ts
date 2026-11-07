import { describe, it, expect } from "vitest";
import { deriveVlsmRequests } from "../../../src/engines/vlan/vlsm-adapter.js";
import { allocateVlsm } from "../../../src/engines/vlsm/index.js";
import type { VlanItem, VlanRequestItem } from "../../../src/contracts/vlan.js";

describe("VLAN to VLSM Adapter", () => {
  const vlanItems: VlanItem[] = [
    { vlanId: 10, name: "MGMT", purpose: "management", subnetName: "MGMT-NET" },
    { vlanId: 20, name: "STAFF", purpose: "staff", subnetName: "STAFF-NET" },
    { vlanId: 30, name: "STUDENTS", purpose: "students", subnetName: "STUDENTS-NET" },
  ];

  const requests: VlanRequestItem[] = [
    { name: "MGMT", purpose: "management", hosts: 20 },
    { name: "STAFF", purpose: "staff", hosts: 300 }, // /23 (510 usable)
    { name: "STUDENTS", purpose: "students", hosts: 850 }, // /22 (1022 usable)
  ];

  it("derives VlsmRequest items matching subnetName and requested hosts", () => {
    const vlsmReqs = deriveVlsmRequests(vlanItems, requests);

    expect(vlsmReqs).toEqual([
      { name: "MGMT-NET", hosts: 20 },
      { name: "STAFF-NET", hosts: 300 },
      { name: "STUDENTS-NET", hosts: 850 },
    ]);
  });

  it("can directly feed the VLSM engine to allocate subnets without overlap", () => {
    const vlsmReqs = deriveVlsmRequests(vlanItems, requests);
    const plan = allocateVlsm("10.0.0.0/16", vlsmReqs);

    expect(plan.subnets.length).toBe(3);
    // Largest first
    expect(plan.subnets[0]?.name).toBe("STUDENTS-NET");
    expect(plan.subnets[1]?.name).toBe("STAFF-NET");
    expect(plan.subnets[2]?.name).toBe("MGMT-NET");

    // All allocated without overlap
    expect(plan.subnets[0]?.network).toBe("10.0.0.0");
    expect(plan.subnets[0]?.prefix).toBe(22); // 850 hosts -> /22 (1022 usable)
  });
});
