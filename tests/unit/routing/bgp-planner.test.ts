import { describe, it, expect } from "vitest";
import { planBgpSessions } from "../../../src/engines/routing/bgp-planner.js";
import { RoutingValidationError } from "../../../src/engines/routing/types.js";
import type { Device } from "../../../src/contracts/topology.js";
import type { SubnetPlanItem } from "../../../src/contracts/vlsm.js";

describe("BGP Planner", () => {
  const devices: Device[] = [
    { id: "RTR-NYC-01", name: "NYC WAN Router", role: "wan-router", siteId: "CITY-D" },
  ];

  const subnets: SubnetPlanItem[] = [
    {
      name: "BRANCH-IOT",
      index: 0,
      network: "10.40.0.0",
      prefix: 24,
      mask: "255.255.255.0",
      wildcard: "0.0.0.255",
      broadcast: "10.40.0.255",
      firstHost: "10.40.0.1",
      lastHost: "10.40.0.254",
      gateway: "10.40.0.1",
      totalAddresses: 256,
      requestedHosts: 100,
      capacity: 254,
      utilization: 0.4,
    },
  ];

  const cloudVpc = {
    provider: "aws",
    vpcCidr: "172.20.0.0/16",
    vpnPeerPublicIps: ["203.0.113.10", "203.0.113.11"],
    iotNodes: 200,
  };

  it("plans eBGP peering session with distinct autonomous systems", () => {
    const sessions = planBgpSessions({
      localAsNumber: 65001,
      remoteAsNumber: 64512,
      devices,
      subnets,
      cloudVpc,
    });

    expect(sessions.length).toBe(1);
    const bgp = sessions[0]!;
    expect(bgp.localDeviceId).toBe("RTR-NYC-01");
    expect(bgp.remoteAsNumber).toBe(64512);
    expect(bgp.neighborIp).toBe("203.0.113.10");
    expect(bgp.advertiseCidrs).toEqual(["10.40.0.0/24"]);
  });

  describe("Boundary Failures & Error Handling", () => {
    it("strictly rejects eBGP configuration when local and remote AS are identical", () => {
      expect(() =>
        planBgpSessions({
          localAsNumber: 65001,
          remoteAsNumber: 65001, // SAME AS!
          devices,
          subnets,
          cloudVpc,
        }),
      ).toThrow(RoutingValidationError);
    });

    it("rejects when no border router is present in topology", () => {
      const accessOnlyDevices: Device[] = [
        { id: "SW-01", name: "Switch 1", role: "access-switch", siteId: "CITY-D" },
      ];

      expect(() =>
        planBgpSessions({
          localAsNumber: 65001,
          remoteAsNumber: 64512,
          devices: accessOnlyDevices,
          subnets,
          cloudVpc,
        }),
      ).toThrow(RoutingValidationError);
    });
  });
});
