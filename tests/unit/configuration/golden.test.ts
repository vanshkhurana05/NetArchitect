import { describe, it, expect } from "vitest";
import { createConfigGenerator } from "../../../src/configuration/generator.js";
import { renderCiscoIos } from "../../../src/configuration/renderer.js";
import type { ConfigBundleInput } from "../../../src/contracts/config.js";
import type { DeviceConfigModel } from "../../../src/configuration/model.js";

describe("Cisco IOS Configuration Generator — Golden Tests", () => {
  const sampleInput: ConfigBundleInput = {
    name: "campus-lan-test",
    devices: [
      { id: "CORE-01", name: "Campus Core Switch 01", role: "core-switch", siteId: "SITE-CORE", portCount: 24 },
      { id: "ACC-A-SW1", name: "Access Switch A1", role: "access-switch", siteId: "BLD-A", portCount: 48, poe: true },
      { id: "RTR-HQ-01", name: "Metro HQ Router", role: "edge-router", siteId: "HQ", portCount: 8 },
      { id: "RTR-WAN-01", name: "Global WAN Router", role: "wan-router", siteId: "CITY-D", portCount: 16 },
    ],
    links: [
      {
        id: "LINK-CORE-ACC",
        aDeviceId: "CORE-01",
        bDeviceId: "ACC-A-SW1",
        kind: "physical",
        bandwidthMbps: 1000,
      },
      {
        id: "LINK-EVPL-PRI",
        aDeviceId: "RTR-HQ-01",
        bDeviceId: "CORE-01",
        kind: "evpl",
        bandwidthMbps: 200,
        betweenSites: ["HQ", "SITE-CORE"],
      },
      {
        id: "LINK-EVPL-SEC",
        aDeviceId: "RTR-HQ-01",
        bDeviceId: "CORE-01",
        kind: "evpl",
        bandwidthMbps: 200,
        betweenSites: ["HQ", "SITE-CORE"],
      },
    ],
    vlanPlan: {
      items: [
        { vlanId: 10, name: "MGMT", purpose: "management", subnetName: "MGMT-NET" },
        { vlanId: 20, name: "STAFF", purpose: "staff", subnetName: "STAFF-NET" },
        { vlanId: 30, name: "STUDENTS", purpose: "students", subnetName: "STUDENTS-NET" },
      ],
      trunks: [
        {
          linkId: "LINK-CORE-ACC",
          allowedVlanIds: [10, 20, 30],
          nativeVlanId: 99,
        },
      ],
      svis: [
        { deviceId: "CORE-01", vlanId: 10, ipCidr: "10.0.0.1/24" },
        { deviceId: "CORE-01", vlanId: 20, ipCidr: "10.0.1.1/24" },
        { deviceId: "CORE-01", vlanId: 30, ipCidr: "10.0.2.1/24" },
      ],
      explanations: [],
    },
    subnets: [
      {
        name: "MGMT-NET",
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
        name: "STAFF-NET",
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
      {
        name: "STUDENTS-NET",
        index: 2,
        network: "10.0.2.0",
        prefix: 24,
        mask: "255.255.255.0",
        wildcard: "0.0.0.255",
        broadcast: "10.0.2.255",
        firstHost: "10.0.2.1",
        lastHost: "10.0.2.254",
        gateway: "10.0.2.1",
        totalAddresses: 256,
        requestedHosts: 200,
        capacity: 254,
        utilization: 0.8,
      },
    ],
    routing: {
      asNumber: 65001,
      protocol: "ospf-ebgp",
      areas: [
        {
          areaId: 0,
          label: "Backbone Area 0",
          siteIds: ["SITE-CORE", "HQ", "CITY-D"],
          networks: [
            { cidr: "10.0.0.0/24", wildcard: "0.0.0.255" },
            { cidr: "10.0.1.0/24", wildcard: "0.0.0.255" },
            { cidr: "10.0.2.0/24", wildcard: "0.0.0.255" },
          ],
        },
      ],
      bgp: [
        {
          localDeviceId: "RTR-WAN-01",
          neighborIp: "203.0.113.10",
          remoteAsNumber: 64512,
          advertiseCidrs: ["10.0.0.0/22"],
        },
      ],
      vpnTunnels: [
        {
          deviceId: "RTR-WAN-01",
          peerPublicIp: "203.0.113.10",
          ikeVersion: 2,
          cryptoProfileName: "IKEv2-PROD-PROFILE",
          localProtectedCidr: "10.0.0.0/22",
          remoteProtectedCidr: "172.20.0.0/16",
        },
      ],
      qos: [
        { className: "VOICE-EF", dscp: "ef", bandwidthPct: 30 },
        { className: "TRANSACTIONAL-AF31", dscp: "af31", bandwidthPct: 40 },
        { className: "DEFAULT-BEST-EFFORT", dscp: "default", bandwidthPct: 10 },
      ],
      explanations: [],
    },
  };

  const generator = createConfigGenerator();
  const result = generator.generate(sampleInput);

  it("generates configs for all devices in bundle", () => {
    expect(result.configs.length).toBe(4);
    const deviceIds = result.configs.map((c) => c.deviceId);
    expect(deviceIds).toEqual(["CORE-01", "ACC-A-SW1", "RTR-HQ-01", "RTR-WAN-01"]);
  });

  describe("Core Switch Golden Config (Catalyst-3560)", () => {
    const coreConfig = result.configs.find((c) => c.deviceId === "CORE-01")!;
    const text = coreConfig.lines.join("\n");

    it("enables ip routing and hostname", () => {
      expect(text).toContain("hostname CORE-01");
      expect(text).toContain("ip routing");
    });

    it("configures Spanning Tree Rapid-PVST with primary root priority 4096", () => {
      expect(text).toContain("spanning-tree mode rapid-pvst");
      expect(text).toContain("spanning-tree vlan 1-4094 priority 4096");
    });

    it("creates 802.1Q VLAN database", () => {
      expect(text).toContain("vlan 10");
      expect(text).toContain("name MGMT");
      expect(text).toContain("vlan 20");
      expect(text).toContain("name STAFF");
    });

    it("renders Packet Tracer compatible dot1q encapsulation and trunk commands", () => {
      expect(text).toContain("switchport trunk encapsulation dot1q");
      expect(text).toContain("switchport mode trunk");
      expect(text).toContain("switchport trunk allowed vlan 10,20,30");
      expect(text).toContain("switchport trunk native vlan 99");
    });

    it("configures SVIs with gateway IP and netmask from VLSM subnets", () => {
      expect(text).toContain("interface Vlan10");
      expect(text).toContain("ip address 10.0.0.1 255.255.255.0");
      expect(text).toContain("interface Vlan20");
      expect(text).toContain("ip address 10.0.1.1 255.255.255.0");
    });

    it("configures OSPF process with exact wildcard masks", () => {
      expect(text).toContain("router ospf 1");
      expect(text).toContain("router-id 10.255.255.1");
      expect(text).toContain("network 10.0.0.0 0.0.0.255 area 0");
      expect(text).toContain("network 10.0.1.0 0.0.0.255 area 0");
    });
  });

  describe("Access Switch Golden Config (Catalyst-2960)", () => {
    const accConfig = result.configs.find((c) => c.deviceId === "ACC-A-SW1")!;
    const text = accConfig.lines.join("\n");

    it("does NOT enable ip routing on L2 access switch", () => {
      expect(text).not.toContain("ip routing");
    });

    it("configures spanning-tree portfast and bpduguard defaults", () => {
      expect(text).toContain("spanning-tree mode rapid-pvst");
      expect(text).toContain("spanning-tree portfast default");
      expect(text).toContain("spanning-tree portfast bpduguard default");
    });

    it("configures access ports assigned to VLANs", () => {
      expect(text).toContain("switchport mode access");
      expect(text).toContain("switchport access vlan");
    });
  });

  describe("Metro Router Golden Config (ISR-4331)", () => {
    const rtrConfig = result.configs.find((c) => c.deviceId === "RTR-HQ-01")!;
    const text = rtrConfig.lines.join("\n");

    it("configures DiffServ QoS class-maps and policy-maps", () => {
      expect(text).toContain("class-map match-all VOICE-EF");
      expect(text).toContain("match ip dscp ef");
      expect(text).toContain("policy-map METRO-EVPL-POLICY");
      expect(text).toContain("priority percent 30");
      expect(text).toContain("bandwidth percent 40");
    });

    it("configures floating static routes for EVPL failover", () => {
      expect(text).toContain("ip route 0.0.0.0 0.0.0.0 10.0.0.1 1");
      expect(text).toContain("ip route 0.0.0.0 0.0.0.0 10.0.0.2 10");
    });
  });

  describe("Global WAN Router Golden Config (ISR-4331)", () => {
    const wanConfig = result.configs.find((c) => c.deviceId === "RTR-WAN-01")!;
    const text = wanConfig.lines.join("\n");

    it("configures BGP peering with Cloud VPC peer IP", () => {
      expect(text).toContain("router bgp 65001");
      expect(text).toContain("neighbor 203.0.113.10 remote-as 64512");
      expect(text).toContain("aggregate-address 10.0.0.0 255.255.240.0 summary-only");
    });

    it("configures IPsec tunnel interface and crypto ACL", () => {
      expect(text).toContain("interface Tunnel100");
      expect(text).toContain("tunnel destination 203.0.113.10");
      expect(text).toContain("tunnel mode ipsec ipv4");
      expect(text).toContain("ip access-list extended IPSEC-CRYPTO-ACL");
    });

    it("hardens console and VTY lines with SSH and management ACL", () => {
      expect(text).toContain("line con 0");
      expect(text).toContain("logging synchronous");
      expect(text).toContain("line vty 0 4");
      expect(text).toContain("transport input ssh");
      expect(text).toContain("access-class MGMT-VTY-ACCESS in");
    });
  });
});
