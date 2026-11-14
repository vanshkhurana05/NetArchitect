/**
 * Level 2 Integration Testing — Complete Pipeline End-to-End.
 * Tests: Profile -> Validation -> Media -> Topology -> VLAN -> VLSM -> Routing -> Device Model -> Cisco Config -> Verification.
 */
import { describe, it, expect } from "vitest";
import { loadPreset } from "../../src/profiles/index.js";
import { buildTopology } from "../../src/engines/topology/index.js";
import { planVlans, deriveVlsmRequests } from "../../src/engines/vlan/index.js";
import { allocateVlsm } from "../../src/engines/vlsm/index.js";
import { planRouting } from "../../src/engines/routing/index.js";
import { createConfigGenerator } from "../../src/configuration/index.js";
import { createVerificationService } from "../../src/verification/index.js";

describe("Level 2 Integration — Full Pipeline Across All 3 Scenarios", () => {
  const verifier = createVerificationService();
  const configGen = createConfigGenerator();

  it("integrates Campus LAN end-to-end and passes all fail-closed invariant checks", async () => {
    // 1. Ingest Profile
    const run = await loadPreset("campus-lan");
    expect(run.source).toBe("preset");
    const input = run.input as any;

    // 2. Topology
    const topo = buildTopology({
      profileShape: {
        profile: "campus-lan",
        buildings: input.buildings,
        collapsedCore: input.collapsedCore,
      },
      mediaByRole: new Map(),
    });
    expect(topo.tier).toBe("collapsed-core");
    expect(topo.devices.length).toBe(49); // 2 core + 3 dist + 44 access

    // 3. VLAN
    const vlans = planVlans({
      requests: input.vlanRequests,
      siteIds: input.buildings.map((b: any) => b.id),
      devices: topo.devices,
      links: topo.links,
    });
    expect(vlans.vlanPlan.items.length).toBe(5);

    // 4. VLSM
    const vlsm = allocateVlsm(
      input.rootBlockCidr,
      deriveVlsmRequests(vlans.vlanPlan.items, input.vlanRequests),
    );
    expect(vlsm.subnets.length).toBe(5);

    // 5. Routing
    const routing = planRouting({
      profile: "campus-lan",
      asNumber: 65001,
      sites: topo.sites,
      devices: topo.devices,
      subnets: vlsm.subnets,
    });
    expect(routing.protocol).toBe("single-area-ospf");

    // 6. Config Generation
    const configResult = configGen.generate({
      name: "campus-lan",
      devices: topo.devices,
      links: topo.links,
      vlanPlan: vlans.vlanPlan,
      subnets: vlsm.subnets,
      routing,
    });
    expect(configResult.configs.length).toBe(49);

    // 7. Invariant Verification
    const verification = verifier.verify({
      subject: "campus-lan",
      subnets: vlsm.subnets,
      vlanIds: vlans.vlanPlan.items.map((v) => v.vlanId),
      devices: topo.devices,
      links: topo.links,
      routing,
      rootBlockCidr: input.rootBlockCidr,
    });

    expect(verification.passed).toBe(true);
    expect(verification.checks.every((c) => c.passed)).toBe(true);
  });

  it("integrates Metro MAN end-to-end and verifies dual-homing, QoS, and sub-5ms SLA", async () => {
    const run = await loadPreset("metro-man");
    const input = run.input as any;

    const topo = buildTopology({
      profileShape: {
        profile: "metro-man",
        sites: input.sites,
        dualHomedFailover: input.dualHomedFailover,
        evplBandwidthMbps: input.evplBandwidthMbps,
      },
      mediaByRole: new Map(),
    });

    const vlans = planVlans({
      requests: input.vlanRequests,
      siteIds: input.sites.map((s: any) => s.id),
      devices: topo.devices,
      links: topo.links,
    });

    const vlsm = allocateVlsm(
      input.rootBlockCidr,
      deriveVlsmRequests(vlans.vlanPlan.items, input.vlanRequests),
    );

    const routing = planRouting({
      profile: "metro-man",
      asNumber: 65001,
      sites: topo.sites,
      devices: topo.devices,
      subnets: vlsm.subnets,
      qosClasses: input.qosClasses,
      links: topo.links,
      evplBandwidthMbps: input.evplBandwidthMbps,
    });
    expect(routing.protocol).toBe("multi-area-ospf");
    expect(routing.qos?.length).toBe(4);

    const configResult = configGen.generate({
      name: "metro-man",
      devices: topo.devices,
      links: topo.links,
      vlanPlan: vlans.vlanPlan,
      subnets: vlsm.subnets,
      routing,
    });
    expect(configResult.configs.length).toBe(6);

    const verification = verifier.verify({
      subject: "metro-man",
      subnets: vlsm.subnets,
      vlanIds: vlans.vlanPlan.items.map((v) => v.vlanId),
      devices: topo.devices,
      links: topo.links,
      routing,
      rootBlockCidr: input.rootBlockCidr,
      latencyTargetMs: input.latencyTargetMs,
    });

    expect(verification.passed).toBe(true);
  });

  it("integrates Global WAN end-to-end and verifies eBGP, IPsec tunnels, and route summarization", async () => {
    const run = await loadPreset("global-wan");
    const input = run.input as any;

    const topo = buildTopology({
      profileShape: {
        profile: "global-wan",
        cities: input.cities,
        cloudVpc: input.cloudVpc,
      },
      mediaByRole: new Map(),
    });

    const vlans = planVlans({
      requests: input.vlanRequests,
      siteIds: input.cities.map((c: any) => c.id),
      devices: topo.devices,
      links: topo.links,
    });

    const vlsm = allocateVlsm(
      input.rootBlockCidr,
      deriveVlsmRequests(vlans.vlanPlan.items, input.vlanRequests),
    );

    const routing = planRouting({
      profile: "global-wan",
      asNumber: 65001,
      sites: topo.sites,
      devices: topo.devices,
      subnets: vlsm.subnets,
      cloudVpc: input.cloudVpc,
      links: topo.links,
    });
    expect(routing.protocol).toBe("ospf-ebgp");
    expect(routing.bgp.length).toBe(1);
    expect(routing.vpnTunnels.length).toBe(2);

    const configResult = configGen.generate({
      name: "global-wan",
      devices: topo.devices,
      links: topo.links,
      vlanPlan: vlans.vlanPlan,
      subnets: vlsm.subnets,
      routing,
    });
    expect(configResult.configs.length).toBe(5);

    const verification = verifier.verify({
      subject: "global-wan",
      subnets: vlsm.subnets,
      vlanIds: vlans.vlanPlan.items.map((v) => v.vlanId),
      devices: topo.devices,
      links: topo.links,
      routing,
      rootBlockCidr: input.rootBlockCidr,
    });

    expect(verification.passed).toBe(true);
  });
});
