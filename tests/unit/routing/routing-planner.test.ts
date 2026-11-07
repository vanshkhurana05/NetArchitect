import { describe, it, expect } from "vitest";
import { planRouting } from "../../../src/engines/routing/routing-planner.js";
import type { RoutingEngineInput } from "../../../src/contracts/routing.js";
import type { SubnetPlanItem } from "../../../src/contracts/vlsm.js";

describe("Routing Planner Master Integration", () => {
  const sampleSubnets: SubnetPlanItem[] = [
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
      name: "DATA",
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

  it("plans Campus LAN routing with Single-Area OSPF Area 0", () => {
    const input: RoutingEngineInput = {
      profile: "campus-lan",
      asNumber: 65001,
      sites: [{ id: "SITE-CORE", label: "MDF", kind: "building", deviceIds: ["CORE-01"] }],
      devices: [{ id: "CORE-01", name: "Core Switch", role: "core-switch", siteId: "SITE-CORE" }],
      subnets: sampleSubnets,
    };

    const plan = planRouting(input);
    expect(plan.protocol).toBe("single-area-ospf");
    expect(plan.areas.length).toBe(1);
    expect(plan.areas[0]?.areaId).toBe(0);
    expect(plan.bgp).toEqual([]);
    expect(plan.vpnTunnels).toEqual([]);
    expect(plan.explanations.length).toBeGreaterThan(0);
  });

  it("plans Metro MAN routing with Multi-Area OSPF, QoS classes, and EVPL failover", () => {
    const input: RoutingEngineInput = {
      profile: "metro-man",
      asNumber: 65001,
      sites: [
        { id: "HQ", label: "HQ", kind: "man-site", deviceIds: ["HQ-RTR-01"] },
        { id: "REMOTE-1", label: "Remote 1", kind: "man-site", deviceIds: ["RTR-R1"] },
      ],
      devices: [
        { id: "HQ-RTR-01", name: "HQ Router", role: "edge-router", siteId: "HQ" },
        { id: "RTR-R1", name: "Remote 1 Router", role: "edge-router", siteId: "REMOTE-1" },
      ],
      subnets: sampleSubnets,
      qosClasses: ["ef-voice", "af31-transactional", "best-effort"],
      links: [
        {
          id: "LINK-EVPL-PRI",
          aDeviceId: "HQ-RTR-01",
          bDeviceId: "RTR-R1",
          kind: "evpl",
          bandwidthMbps: 200,
          betweenSites: ["HQ", "REMOTE-1"],
        },
        {
          id: "LINK-EVPL-SEC",
          aDeviceId: "HQ-RTR-01",
          bDeviceId: "RTR-R1",
          kind: "evpl",
          bandwidthMbps: 200,
          betweenSites: ["HQ", "REMOTE-1"],
        },
      ],
    };

    const plan = planRouting(input);
    expect(plan.protocol).toBe("multi-area-ospf");
    expect(plan.qos).toBeDefined();
    expect(plan.qos?.length).toBe(4);
    expect(plan.explanations.some((e) => e.module === "qos")).toBe(true);
    expect(plan.explanations.some((e) => e.decision.includes("failover"))).toBe(true);
  });

  it("plans Global WAN routing with eBGP peering to Cloud VPC and IKEv2 IPsec VPN", () => {
    const input: RoutingEngineInput = {
      profile: "global-wan",
      asNumber: 65001,
      sites: [
        { id: "CITY-D", label: "Delhi HQ", kind: "city", deviceIds: ["RTR-DELHI"] },
        { id: "CITY-M", label: "Mumbai", kind: "city", deviceIds: ["RTR-MUMBAI"] },
      ],
      devices: [
        { id: "RTR-DELHI", name: "Delhi WAN Router", role: "wan-router", siteId: "CITY-D" },
        { id: "RTR-MUMBAI", name: "Mumbai WAN Router", role: "wan-router", siteId: "CITY-M" },
      ],
      subnets: sampleSubnets,
      cloudVpc: {
        provider: "aws",
        vpcCidr: "172.20.0.0/16",
        vpnPeerPublicIps: ["203.0.113.10"],
        iotNodes: 200,
      },
    };

    const plan = planRouting(input);
    expect(plan.protocol).toBe("ospf-ebgp");
    expect(plan.bgp.length).toBe(1);
    expect(plan.bgp[0]?.remoteAsNumber).toBe(64512); // Cloud provider ASN
    expect(plan.bgp[0]?.neighborIp).toBe("203.0.113.10");
    expect(plan.vpnTunnels.length).toBe(1);
    expect(plan.vpnTunnels[0]?.remoteProtectedCidr).toBe("172.20.0.0/16");
    expect(plan.vpnTunnels[0]?.ikeVersion).toBe(2);
  });
});
