import { describe, it, expect } from "vitest";
import { createVerificationService } from "../../../src/verification/service.js";
import type { VerificationInput } from "../../../src/contracts/verification.js";
import type { SubnetPlanItem } from "../../../src/contracts/vlsm.js";

describe("Network Verification Service — Invariant Checks (V-01..V-10)", () => {
  const healthySubnets: SubnetPlanItem[] = [
    {
      name: "MGMT",
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
      requestedHosts: 20,
      capacity: 254,
      utilization: 0.1,
    },
    {
      name: "STAFF",
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
      requestedHosts: 200,
      capacity: 254,
      utilization: 0.8,
    },
  ];

  const healthyInput: VerificationInput = {
    subject: "campus-lan",
    subnets: healthySubnets,
    vlanIds: [10, 20],
    devices: [
      { id: "CORE-01", name: "Core Switch", role: "core-switch" },
      { id: "ACC-01", name: "Access Switch", role: "access-switch" },
    ],
    links: [
      {
        id: "LINK-1",
        aDeviceId: "CORE-01",
        bDeviceId: "ACC-01",
        kind: "physical",
        bandwidthMbps: 1000,
        phys: {
          runMeters: 80,
          standard: "10GBASE-T",
          spec: { medium: "cat6a", standard: "10GBASE-T", wavelengthNm: 0, maxReachMeters: 100 },
        },
      },
    ],
    routing: {
      asNumber: 65001,
      protocol: "single-area-ospf",
      areas: [
        {
          areaId: 0,
          label: "Backbone",
          siteIds: ["SITE-1"],
          networks: [
            { cidr: "10.0.0.0/24", wildcard: "0.0.0.255" },
            { cidr: "10.0.1.0/24", wildcard: "0.0.0.255" },
          ],
        },
      ],
      bgp: [],
      vpnTunnels: [],
      explanations: [],
    },
    rootBlockCidr: "10.0.0.0/16",
    latencyTargetMs: 5,
  };

  const verifier = createVerificationService();

  it("passes all verification checks on healthy network input", () => {
    const report = verifier.verify(healthyInput);
    expect(report.passed).toBe(true);
    expect(report.checks.every((c) => c.passed)).toBe(true);
  });

  it("fails V-01 when subnets overlap", () => {
    const overlappingSubnets: SubnetPlanItem[] = [
      healthySubnets[0]!,
      {
        ...healthySubnets[1]!,
        network: "10.0.0.128", // Overlaps with 10.0.0.0/24!
        prefix: 25,
      },
    ];

    const report = verifier.verify({
      ...healthyInput,
      subnets: overlappingSubnets,
    });

    expect(report.passed).toBe(false);
    const v01 = report.checks.find((c) => c.id === "V-01")!;
    expect(v01.passed).toBe(false);
    expect(v01.detail).toContain("Overlap detected");
  });

  it("fails V-02 when subnet falls outside root block", () => {
    const outOfBoundsSubnet: SubnetPlanItem[] = [
      {
        ...healthySubnets[0]!,
        network: "192.168.1.0", // Outside 10.0.0.0/16!
        prefix: 24,
      },
    ];

    const report = verifier.verify({
      ...healthyInput,
      subnets: outOfBoundsSubnet,
    });

    expect(report.passed).toBe(false);
    const v02 = report.checks.find((c) => c.id === "V-02")!;
    expect(v02.passed).toBe(false);
    expect(v02.detail).toContain("falls outside root block");
  });

  it("fails V-04 when wildcard mask does not match bitwise inverse", () => {
    const badWildcardSubnets: SubnetPlanItem[] = [
      {
        ...healthySubnets[0]!,
        wildcard: "0.0.0.0", // Mismatch! For /24 it must be 0.0.0.255
      },
    ];

    const report = verifier.verify({
      ...healthyInput,
      subnets: badWildcardSubnets,
    });

    expect(report.passed).toBe(false);
    const v04 = report.checks.find((c) => c.id === "V-04")!;
    expect(v04.passed).toBe(false);
    expect(v04.detail).toContain("wildcard mask mismatch");
  });

  it("fails V-06 when Native VLAN 99 is assigned to client broadcast domain", () => {
    const report = verifier.verify({
      ...healthyInput,
      vlanIds: [10, 99], // VLAN 99 assigned!
    });

    expect(report.passed).toBe(false);
    const v06 = report.checks.find((c) => c.id === "V-06")!;
    expect(v06.passed).toBe(false);
    expect(v06.detail).toContain("Native VLAN 99");
  });

  it("fails V-08 when physical copper run exceeds 100m limit", () => {
    const report = verifier.verify({
      ...healthyInput,
      links: [
        {
          id: "LINK-VIOLATION",
          aDeviceId: "CORE-01",
          bDeviceId: "ACC-01",
          kind: "physical",
          bandwidthMbps: 1000,
          phys: {
            runMeters: 120, // 120m > 100m!
            standard: "10GBASE-T",
            spec: { medium: "cat6a", standard: "10GBASE-T", wavelengthNm: 0, maxReachMeters: 100 },
          },
        },
      ],
    });

    expect(report.passed).toBe(false);
    const v08 = report.checks.find((c) => c.id === "V-08")!;
    expect(v08.passed).toBe(false);
    expect(v08.detail).toContain("100m IEEE 802.3an limit");
  });

  it("fails V-10 when metro circuit latency exceeds SLA target", () => {
    const report = verifier.verify({
      ...healthyInput,
      latencyTargetMs: 5,
      links: [
        {
          id: "LINK-EVPL-SLOW",
          aDeviceId: "CORE-01",
          bDeviceId: "ACC-01",
          kind: "evpl",
          bandwidthMbps: 200,
          latencyMs: 7.5, // 7.5 ms > 5.0 ms!
        },
      ],
    });

    expect(report.passed).toBe(false);
    const v10 = report.checks.find((c) => c.id === "V-10")!;
    expect(v10.passed).toBe(false);
    expect(v10.detail).toContain("exceeds the 5 ms SLA threshold");
  });
});
