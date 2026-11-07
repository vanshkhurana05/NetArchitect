import { describe, it, expect } from "vitest";
import { buildTopology } from "../../../src/engines/topology/builder.js";
import type { TopologyRequest } from "../../../src/contracts/topology.js";

describe("Topology Builder", () => {
  describe("Campus LAN Topology", () => {
    const campusRequest: TopologyRequest = {
      profileShape: {
        profile: "campus-lan",
        buildings: [
          { id: "BLD-A", name: "Engineering", backboneRunMeters: 85, floors: 3, accessRunMeters: 90, endpoints: 620 },
          { id: "BLD-B", name: "Library", backboneRunMeters: 190, floors: 4, accessRunMeters: 90, endpoints: 580 },
          { id: "BLD-C", name: "Admin", backboneRunMeters: 380, floors: 2, accessRunMeters: 88, endpoints: 400 },
        ],
        collapsedCore: true,
      },
      mediaByRole: new Map(),
    };

    it("builds a collapsed-core topology with dual core switches and inter-core link", () => {
      const topo = buildTopology(campusRequest);

      expect(topo.tier).toBe("collapsed-core");
      const core1 = topo.devices.find((d) => d.id === "CORE-01");
      const core2 = topo.devices.find((d) => d.id === "CORE-02");
      expect(core1).toBeDefined();
      expect(core2).toBeDefined();
      expect(core1?.role).toBe("core-switch");
      expect(core2?.role).toBe("core-switch");

      // Verify inter-core link exists
      const interCoreLink = topo.links.find(
        (l) =>
          (l.aDeviceId === "CORE-01" && l.bDeviceId === "CORE-02") ||
          (l.aDeviceId === "CORE-02" && l.bDeviceId === "CORE-01"),
      );
      expect(interCoreLink).toBeDefined();
      expect(interCoreLink?.bandwidthMbps).toBe(10000);
    });

    it("creates distribution switches with redundant uplinks to both core switches", () => {
      const topo = buildTopology(campusRequest);

      for (const bldId of ["BLD-A", "BLD-B", "BLD-C"]) {
        const distSwitch = topo.devices.find((d) => d.id === `DIST-${bldId}`);
        expect(distSwitch).toBeDefined();
        expect(distSwitch?.role).toBe("distribution-switch");

        // Uplink to CORE-01
        const uplink1 = topo.links.find(
          (l) => l.aDeviceId === `DIST-${bldId}` && l.bDeviceId === "CORE-01",
        );
        expect(uplink1).toBeDefined();
        expect(uplink1?.bandwidthMbps).toBe(10000);

        // Uplink to CORE-02
        const uplink2 = topo.links.find(
          (l) => l.aDeviceId === `DIST-${bldId}` && l.bDeviceId === "CORE-02",
        );
        expect(uplink2).toBeDefined();
        expect(uplink2?.bandwidthMbps).toBe(10000);
      }
    });

    it("sizes access switches per building with PoE and links to distribution switch", () => {
      const topo = buildTopology(campusRequest);

      const accessSwitchesA = topo.devices.filter(
        (d) => d.siteId === "BLD-A" && d.role === "access-switch",
      );
      expect(accessSwitchesA.length).toBe(17); // 620 endpoints
      expect(accessSwitchesA[0]?.poe).toBe(true);

      // Verify access switches are connected to DIST-BLD-A
      for (const acc of accessSwitchesA) {
        const link = topo.links.find(
          (l) => l.aDeviceId === acc.id && l.bDeviceId === "DIST-BLD-A",
        );
        expect(link).toBeDefined();
        expect(link?.bandwidthMbps).toBe(1000);
      }
    });

    it("generates natural-language explainability records", () => {
      const topo = buildTopology(campusRequest);
      expect(topo.explanations.length).toBeGreaterThan(0);
      const coreRecord = topo.explanations.find((e) => e.rule === "TOPO.01");
      expect(coreRecord).toBeDefined();
      expect(coreRecord?.decision).toContain("collapsed-core");
      expect(coreRecord?.references).toContain("Cisco Campus LAN Design Guide");
    });
  });

  describe("Metro MAN Topology", () => {
    const metroRequest: TopologyRequest = {
      profileShape: {
        profile: "metro-man",
        sites: [
          { id: "HQ", name: "FinTech HQ", role: "hq", distanceKm: 18, users: 200 },
          { id: "REMOTE-1", name: "Colombo East", role: "remote", distanceKm: 27, users: 150 },
          { id: "REMOTE-2", name: "Harbour Front", role: "remote", distanceKm: 34, users: 100 },
        ],
        dualHomedFailover: true,
        evplBandwidthMbps: 200,
      },
      mediaByRole: new Map(),
    };

    it("builds HQ router/switch and remote routers with dual-homed EVPL links", () => {
      const topo = buildTopology(metroRequest);

      const hqRouter = topo.devices.find((d) => d.id === "HQ-RTR-01");
      expect(hqRouter).toBeDefined();
      expect(hqRouter?.role).toBe("edge-router");

      for (const remoteId of ["REMOTE-1", "REMOTE-2"]) {
        const rtr = topo.devices.find((d) => d.id === `RTR-${remoteId}`);
        expect(rtr).toBeDefined();

        // Primary EVPL link to HQ
        const priLink = topo.links.find(
          (l) => l.aDeviceId === `RTR-${remoteId}` && l.bDeviceId === "HQ-RTR-01" && l.id.includes("PRI"),
        );
        expect(priLink).toBeDefined();
        expect(priLink?.kind).toBe("evpl");
        expect(priLink?.phys?.standard).toBe("10GBASE-ER"); // 27/34 km -> 10GBASE-ER OS2

        // Secondary EVPL failover link to HQ
        const secLink = topo.links.find(
          (l) => l.aDeviceId === `RTR-${remoteId}` && l.bDeviceId === "HQ-RTR-01" && l.id.includes("SEC"),
        );
        expect(secLink).toBeDefined();
        expect(secLink?.kind).toBe("evpl");
      }
    });
  });

  describe("Global WAN Topology", () => {
    const wanRequest: TopologyRequest = {
      profileShape: {
        profile: "global-wan",
        cities: [
          { id: "CITY-D", name: "Delhi HQ", role: "hq", devices: 600, transport: "ipsec-internet" },
          { id: "CITY-M", name: "Mumbai", role: "branch", devices: 450, transport: "ipsec-internet" },
          { id: "CITY-K", name: "Kolkata", role: "branch", devices: 350, transport: "ipsec-internet" },
          { id: "CITY-C", name: "Chennai", role: "branch", devices: 400, transport: "ipsec-internet" },
        ],
        cloudVpc: {
          provider: "aws",
          vpcCidr: "172.20.0.0/16",
          vpnPeerPublicIps: ["203.0.113.10", "203.0.113.11"],
          iotNodes: 200,
        },
      },
      mediaByRole: new Map(),
    };

    it("builds 4 city WAN routers and Cloud VPC Gateway with IPsec and BGP sessions", () => {
      const topo = buildTopology(wanRequest);

      // Verify all city routers exist
      for (const cityId of ["CITY-D", "CITY-M", "CITY-K", "CITY-C"]) {
        const rtr = topo.devices.find((d) => d.id === `RTR-${cityId}`);
        expect(rtr).toBeDefined();
        expect(rtr?.role).toBe("wan-router");
      }

      // Verify Cloud Gateway exists
      const cloudGw = topo.devices.find((d) => d.role === "cloud-vpn-gateway");
      expect(cloudGw).toBeDefined();
      expect(cloudGw?.id).toBe("GW-CLOUD-VPC");

      // Verify IPsec and BGP links between HQ and Cloud
      const ipsecLink = topo.links.find(
        (l) => l.aDeviceId === "RTR-CITY-D" && l.bDeviceId === "GW-CLOUD-VPC" && l.kind === "ipsec-tunnel",
      );
      expect(ipsecLink).toBeDefined();

      const bgpLink = topo.links.find(
        (l) => l.aDeviceId === "RTR-CITY-D" && l.bDeviceId === "GW-CLOUD-VPC" && l.kind === "bgp-session",
      );
      expect(bgpLink).toBeDefined();
    });
  });
});
