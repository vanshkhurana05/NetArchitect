/**
 * Topology Graph Builder.
 * Implements topology construction across Campus LAN, Metro MAN, and Global WAN.
 * Populates device hierarchies, interface-to-interface mappings, and media integration.
 * OWNER: Topology specialist agent (src/engines/topology/).
 */
import type { TopologyRequest, Topology, Site, DeviceRole } from "../../contracts/topology.js";
import type { ExplainRecord } from "../../contracts/explain.js";
import { recommendMedia } from "../media/index.js";
import { NetworkGraph } from "./graph.js";
import { planCampusDevices, DEFAULT_PLANNING_CONFIG } from "./device-planner.js";
import type { TopologyNode, TopologyEdge, DeviceInterfaceInfo, TopologyBuilderOptions } from "./types.js";

/** Helper to generate standard Cisco interface names. */
function makeInterface(name: string, speedMbps: number, kind: "copper" | "fiber" | "virtual"): DeviceInterfaceInfo {
  return { name, speedMbps, kind };
}

/**
 * Builds standard GigabitEthernet and TenGigabitEthernet interfaces for a switch/router.
 */
function createInterfaces(
  prefix: string,
  count: number,
  speedMbps: number,
  kind: "copper" | "fiber" | "virtual",
): DeviceInterfaceInfo[] {
  const ifaces: DeviceInterfaceInfo[] = [];
  for (let i = 1; i <= count; i++) {
    ifaces.push(makeInterface(`${prefix}1/0/${i}`, speedMbps, kind));
  }
  return ifaces;
}

/**
 * Builds the Campus LAN topology:
 * - Collapsed Core Layer: 2 redundant core switches (CORE-01, CORE-02) with inter-core link
 * - Distribution Layer: 1 distribution switch per building with redundant uplinks to both cores
 * - Access Layer: Switch count derived algorithmically by device planner based on endpoints & PoE
 */
function buildCampusTopology(
  buildings: Array<{ id: string; name: string; backboneRunMeters: number; accessRunMeters: number; endpoints: number }>,
  mediaByRole: TopologyRequest["mediaByRole"],
  options?: TopologyBuilderOptions,
): NetworkGraph {
  const graph = new NetworkGraph();
  graph.tier = options?.collapsedCore !== false ? "collapsed-core" : "three-tier";

  // Core Site / MDF
  const coreSite: Site = {
    id: "SITE-CORE",
    label: "Campus Main Distribution Facility (MDF)",
    kind: "building",
    deviceIds: [],
  };
  graph.addSite(coreSite);

  // 1. Core Switches (CORE-01, CORE-02)
  const core1: TopologyNode = {
    id: "CORE-01",
    name: "Campus Core Switch 01",
    role: "core-switch",
    siteId: "SITE-CORE",
    portCount: 24,
    mgmtIp: "10.0.0.1",
    interfaces: [
      ...createInterfaces("TenGigabitEthernet", 8, 10000, "fiber"),
      ...createInterfaces("GigabitEthernet", 16, 1000, "copper"),
    ],
  };

  const core2: TopologyNode = {
    id: "CORE-02",
    name: "Campus Core Switch 02",
    role: "core-switch",
    siteId: "SITE-CORE",
    portCount: 24,
    mgmtIp: "10.0.0.2",
    interfaces: [
      ...createInterfaces("TenGigabitEthernet", 8, 10000, "fiber"),
      ...createInterfaces("GigabitEthernet", 16, 1000, "copper"),
    ],
  };

  graph.addNode(core1);
  graph.addNode(core2);

  // Inter-core link (Port-Channel / 10G trunk)
  const interCoreMedia = recommendMedia({ runMeters: 5, role: "building-backbone" });
  const interCoreLink: TopologyEdge = {
    id: "LINK-CORE-INTERCONNECT",
    aDeviceId: "CORE-01",
    bDeviceId: "CORE-02",
    aInterface: "TenGigabitEthernet1/0/1",
    bInterface: "TenGigabitEthernet1/0/1",
    kind: "physical",
    bandwidthMbps: 10000,
    phys: {
      runMeters: 5,
      spec: interCoreMedia.chosen,
      standard: interCoreMedia.chosen.standard,
    },
    isRedundant: true,
  };
  graph.addEdge(interCoreLink);

  graph.addExplanation({
    id: "TOPO.CAMPUS-COLLAPSED-CORE",
    module: "topology",
    rule: "TOPO.01",
    decision: "Deployed 2 redundant L3 Core switches in collapsed-core topology",
    rationale: "Collapsed-core topology combines core and distribution functions for campuses < 5,000 endpoints, providing high availability with lower operational complexity.",
    inputs: { buildingsCount: buildings.length, coreSwitches: 2 },
    references: ["Cisco Campus LAN Design Guide", "IEEE 802.1D RSTP"],
  });

  // 2. Plan and instantiate Distribution and Access switches for each building
  const buildingPlans = planCampusDevices(buildings as any, options?.planningConfig);

  let coreUplinkPortIndex = 2; // Ports 2, 3, 4... used for building uplinks

  for (let idx = 0; idx < buildings.length; idx++) {
    const bld = buildings[idx];
    const plan = buildingPlans[idx];
    if (!bld || !plan) continue;

    const bldSite: Site = {
      id: bld.id,
      label: bld.name,
      kind: "building",
      deviceIds: [],
    };
    graph.addSite(bldSite);

    // Distribution Switch for Building
    const distSwitchId = `DIST-${bld.id}`;
    const distSwitch: TopologyNode = {
      id: distSwitchId,
      name: `Distribution Switch ${bld.name}`,
      role: "distribution-switch",
      siteId: bld.id,
      portCount: 24,
      interfaces: [
        ...createInterfaces("TenGigabitEthernet", 4, 10000, "fiber"),
        ...createInterfaces("GigabitEthernet", 20, 1000, "copper"),
      ],
    };
    graph.addNode(distSwitch);

    // Uplinks: DIST -> CORE-01 and DIST -> CORE-02
    const mediaEnv =
      mediaByRole.get(`${bld.id}:building-backbone`) ??
      recommendMedia({ runMeters: bld.backboneRunMeters, role: "building-backbone" });

    const uplink1: TopologyEdge = {
      id: `LINK-${distSwitchId}-CORE-01`,
      aDeviceId: distSwitchId,
      bDeviceId: "CORE-01",
      aInterface: "TenGigabitEthernet1/0/1",
      bInterface: `TenGigabitEthernet1/0/${coreUplinkPortIndex}`,
      kind: "physical",
      bandwidthMbps: 10000,
      phys: {
        runMeters: bld.backboneRunMeters,
        spec: mediaEnv.chosen,
        standard: mediaEnv.chosen.standard,
      },
      isRedundant: true,
    };
    graph.addEdge(uplink1);

    const uplink2: TopologyEdge = {
      id: `LINK-${distSwitchId}-CORE-02`,
      aDeviceId: distSwitchId,
      bDeviceId: "CORE-02",
      aInterface: "TenGigabitEthernet1/0/2",
      bInterface: `TenGigabitEthernet1/0/${coreUplinkPortIndex}`,
      kind: "physical",
      bandwidthMbps: 10000,
      phys: {
        runMeters: bld.backboneRunMeters,
        spec: mediaEnv.chosen,
        standard: mediaEnv.chosen.standard,
      },
      isRedundant: true,
    };
    graph.addEdge(uplink2);
    coreUplinkPortIndex++;

    // Access Switches for Building
    for (let sw = 1; sw <= plan.accessSwitchesCount; sw++) {
      const accessSwitchId = `ACC-${bld.id}-SW${sw}`;
      const accessSwitch: TopologyNode = {
        id: accessSwitchId,
        name: `Access Switch ${bld.id} #${sw}`,
        role: "access-switch",
        siteId: bld.id,
        portCount: 48,
        poe: true,
        endpointsServed: Math.min(
          plan.endpoints,
          Math.ceil(plan.endpoints / plan.accessSwitchesCount),
        ),
        interfaces: [
          ...createInterfaces("GigabitEthernet", 48, 1000, "copper"),
          ...createInterfaces("TenGigabitEthernet", 4, 10000, "fiber"),
        ],
      };
      graph.addNode(accessSwitch);

      // Access Uplink to Building Distribution Switch
      const accessMedia = recommendMedia({ runMeters: bld.accessRunMeters, role: "access" });
      const accessUplink: TopologyEdge = {
        id: `LINK-${accessSwitchId}-${distSwitchId}`,
        aDeviceId: accessSwitchId,
        bDeviceId: distSwitchId,
        aInterface: "TenGigabitEthernet1/0/1",
        bInterface: `GigabitEthernet1/0/${sw}`,
        kind: "physical",
        bandwidthMbps: 1000,
        phys: {
          runMeters: bld.accessRunMeters,
          spec: accessMedia.chosen,
          standard: accessMedia.chosen.standard,
        },
      };
      graph.addEdge(accessUplink);
    }

    graph.addExplanation({
      id: `TOPO.BUILDING-PLAN.${bld.id}`,
      module: "topology",
      rule: "TOPO.02",
      decision: `Sized ${plan.accessSwitchesCount} access switches and 1 distribution switch for ${bld.id}`,
      rationale: plan.rationale.join(" "),
      inputs: { endpoints: bld.endpoints, accessSwitches: plan.accessSwitchesCount, apCount: plan.apCount },
      references: ["IEEE 802.3at PoE+", "ANSI/TIA-568.0-D"],
    });
  }

  return graph;
}

/**
 * Builds the Metro MAN topology:
 * - HQ site with Edge Router (HQ-RTR-01) and Core Switch (HQ-SW-01)
 * - Remote branch sites with edge routers
 * - Dual-homed EVPL circuits connecting remote sites to HQ over OS2 SMF (10GBASE-ER)
 */
function buildMetroTopology(
  sites: Array<{ id: string; name: string; role: "hq" | "remote"; distanceKm: number; users: number }>,
  dualHomedFailover: boolean = true,
  evplBandwidthMbps: number = 200,
): NetworkGraph {
  const graph = new NetworkGraph();
  graph.tier = "collapsed-core";

  const hqSiteSpec = sites.find((s) => s.role === "hq") ?? sites[0];
  if (!hqSiteSpec) {
    throw new Error("Cannot build metro topology without at least one site.");
  }

  // 1. Add Sites
  for (const s of sites) {
    graph.addSite({
      id: s.id,
      label: s.name,
      kind: "man-site",
      deviceIds: [],
    });
  }

  // 2. HQ Devices
  const hqRouter: TopologyNode = {
    id: "HQ-RTR-01",
    name: `HQ Edge Router (${hqSiteSpec.name})`,
    role: "edge-router",
    siteId: hqSiteSpec.id,
    portCount: 16,
    mgmtIp: "10.0.0.1",
    interfaces: [
      ...createInterfaces("GigabitEthernet", 8, 1000, "copper"),
      ...createInterfaces("TenGigabitEthernet", 8, 10000, "fiber"),
    ],
  };

  const hqSwitch: TopologyNode = {
    id: "HQ-SW-01",
    name: `HQ Core Switch (${hqSiteSpec.name})`,
    role: "core-switch",
    siteId: hqSiteSpec.id,
    portCount: 24,
    mgmtIp: "10.0.0.2",
    interfaces: createInterfaces("GigabitEthernet", 24, 1000, "copper"),
  };

  graph.addNode(hqRouter);
  graph.addNode(hqSwitch);

  // Link HQ-RTR-01 <-> HQ-SW-01
  const hqLanLink: TopologyEdge = {
    id: "LINK-HQ-ROUTER-SWITCH",
    aDeviceId: "HQ-RTR-01",
    bDeviceId: "HQ-SW-01",
    aInterface: "GigabitEthernet1/0/1",
    bInterface: "GigabitEthernet1/0/1",
    kind: "physical",
    bandwidthMbps: 1000,
  };
  graph.addEdge(hqLanLink);

  // 3. Remote Sites & EVPL circuits
  const remoteSites = sites.filter((s) => s.id !== hqSiteSpec.id);
  let hqWanPortIdx = 1;

  for (const rSite of remoteSites) {
    const routerId = `RTR-${rSite.id}`;
    const switchId = `SW-${rSite.id}`;

    const remoteRouter: TopologyNode = {
      id: routerId,
      name: `Edge Router ${rSite.name}`,
      role: "edge-router",
      siteId: rSite.id,
      portCount: 8,
      mgmtIp: `10.0.${hqWanPortIdx}.1`,
      interfaces: [
        ...createInterfaces("GigabitEthernet", 4, 1000, "copper"),
        ...createInterfaces("TenGigabitEthernet", 4, 10000, "fiber"),
      ],
    };

    const remoteSwitch: TopologyNode = {
      id: switchId,
      name: `Access Switch ${rSite.name}`,
      role: "access-switch",
      siteId: rSite.id,
      portCount: 24,
      interfaces: createInterfaces("GigabitEthernet", 24, 1000, "copper"),
    };

    graph.addNode(remoteRouter);
    graph.addNode(remoteSwitch);

    // Local LAN Link
    graph.addEdge({
      id: `LINK-${routerId}-${switchId}`,
      aDeviceId: routerId,
      bDeviceId: switchId,
      aInterface: "GigabitEthernet1/0/1",
      bInterface: "GigabitEthernet1/0/1",
      kind: "physical",
      bandwidthMbps: 1000,
    });

    // Primary EVPL WAN Link over OS2 SMF
    const runMeters = rSite.distanceKm * 1000;
    const mediaEnv = recommendMedia({ runMeters, role: "man-evpl" });
    const primaryLink: TopologyEdge = {
      id: `LINK-EVPL-${rSite.id}-HQ-PRI`,
      aDeviceId: routerId,
      bDeviceId: "HQ-RTR-01",
      aInterface: "TenGigabitEthernet1/0/1",
      bInterface: `TenGigabitEthernet1/0/${hqWanPortIdx}`,
      kind: "evpl",
      bandwidthMbps: evplBandwidthMbps,
      latencyMs: +(rSite.distanceKm * 0.005 + 0.1).toFixed(3), // 5 µs/km propagation + 100 µs switching
      betweenSites: [rSite.id, hqSiteSpec.id],
      phys: {
        runMeters,
        spec: mediaEnv.chosen,
        standard: mediaEnv.chosen.standard,
      },
    };
    graph.addEdge(primaryLink);

    // Dual-homed failover EVPL Link
    if (dualHomedFailover) {
      const backupLink: TopologyEdge = {
        id: `LINK-EVPL-${rSite.id}-HQ-SEC`,
        aDeviceId: routerId,
        bDeviceId: "HQ-RTR-01",
        aInterface: "TenGigabitEthernet1/0/2",
        bInterface: `TenGigabitEthernet1/0/${hqWanPortIdx + 4}`,
        kind: "evpl",
        bandwidthMbps: evplBandwidthMbps,
        latencyMs: +(rSite.distanceKm * 0.005 + 0.1).toFixed(3),
        betweenSites: [rSite.id, hqSiteSpec.id],
        isRedundant: true,
        phys: {
          runMeters,
          spec: mediaEnv.chosen,
          standard: mediaEnv.chosen.standard,
        },
      };
      graph.addEdge(backupLink);
    }

    hqWanPortIdx++;
  }

  graph.addExplanation({
    id: "TOPO.METRO-EVPL-DUALHOMED",
    module: "topology",
    rule: "TOPO.03",
    decision: "Configured dual-homed EVPL connections with primary and backup paths",
    rationale: "Dual-homing remote edge routers to distinct HQ provider interfaces satisfies high-availability SLAs and sub-5ms failover guarantees.",
    inputs: { remoteSitesCount: remoteSites.length, dualHomedFailover, evplBandwidthMbps },
    references: ["MEF 6.2 EVPL Specification", "IEEE 802.3ae 10GBASE-ER"],
  });

  return graph;
}

/**
 * Builds the Global WAN topology:
 * - 4 city locations with WAN edge routers
 * - Cloud VPC with Cloud VPN Gateway
 * - Inter-site leased DC circuits and IPsec VPN tunnels across public Internet
 */
function buildGlobalWanTopology(
  cities: Array<{ id: string; name: string; role: "hq" | "branch" | "cloud-vpc"; devices: number; transport: "leased-dc" | "ipsec-internet" }>,
  cloudVpc?: { provider: "aws" | "azure" | "gcp"; vpcCidr: string; vpnPeerPublicIps: string[]; iotNodes?: number },
): NetworkGraph {
  const graph = new NetworkGraph();
  graph.tier = "three-tier";

  // 1. Add City Sites & WAN Routers
  for (const city of cities) {
    graph.addSite({
      id: city.id,
      label: city.name,
      kind: "city",
      deviceIds: [],
    });

    const routerId = `RTR-${city.id}`;
    const wanRouter: TopologyNode = {
      id: routerId,
      name: `WAN Router ${city.name}`,
      role: "wan-router",
      siteId: city.id,
      portCount: 16,
      interfaces: [
        ...createInterfaces("GigabitEthernet", 8, 1000, "copper"),
        ...createInterfaces("TenGigabitEthernet", 8, 10000, "fiber"),
      ],
    };
    graph.addNode(wanRouter);
  }

  // 2. Add Cloud VPC Site and Cloud VPN Gateway if present
  let cloudGatewayId: string | undefined;
  if (cloudVpc) {
    const cloudSite: Site = {
      id: "SITE-CLOUD-VPC",
      label: `Cloud VPC (${cloudVpc.provider.toUpperCase()})`,
      kind: "cloud-vpc",
      deviceIds: [],
    };
    graph.addSite(cloudSite);

    cloudGatewayId = "GW-CLOUD-VPC";
    const cloudGw: TopologyNode = {
      id: cloudGatewayId,
      name: `Cloud VPN Gateway (${cloudVpc.provider.toUpperCase()} VGW)`,
      role: "cloud-vpn-gateway",
      siteId: "SITE-CLOUD-VPC",
      portCount: 8,
      interfaces: [
        makeInterface("Tunnel1", 1000, "virtual"),
        makeInterface("Tunnel2", 1000, "virtual"),
        makeInterface("GigabitEthernet0/0", 1000, "virtual"),
      ],
    };
    graph.addNode(cloudGw);
  }

  // 3. Connect Cities: Backbone Hub (HQ) to Branch Cities
  const hqCity = cities.find((c) => c.role === "hq") ?? cities[0];
  if (!hqCity) {
    throw new Error("Cannot build global WAN topology without at least one city.");
  }
  const branchCities = cities.filter((c) => c.id !== hqCity.id);

  let linkIdx = 1;
  for (const branch of branchCities) {
    const linkKind = branch.transport === "leased-dc" ? "physical" : "ipsec-tunnel";
    graph.addEdge({
      id: `LINK-WAN-${hqCity.id}-${branch.id}`,
      aDeviceId: `RTR-${hqCity.id}`,
      bDeviceId: `RTR-${branch.id}`,
      aInterface: `GigabitEthernet1/0/${linkIdx}`,
      bInterface: "GigabitEthernet1/0/1",
      kind: linkKind,
      bandwidthMbps: branch.transport === "leased-dc" ? 1000 : 100,
      betweenSites: [hqCity.id, branch.id],
    });
    linkIdx++;
  }

  // 4. Connect HQ to Cloud VPC via IPsec Tunnel and BGP Session
  if (cloudGatewayId) {
    graph.addEdge({
      id: "LINK-IPSEC-HQ-CLOUD",
      aDeviceId: `RTR-${hqCity.id}`,
      bDeviceId: cloudGatewayId,
      aInterface: "Tunnel100",
      bInterface: "Tunnel1",
      kind: "ipsec-tunnel",
      bandwidthMbps: 1000,
      betweenSites: [hqCity.id, "SITE-CLOUD-VPC"],
    });

    graph.addEdge({
      id: "LINK-BGP-HQ-CLOUD",
      aDeviceId: `RTR-${hqCity.id}`,
      bDeviceId: cloudGatewayId,
      aInterface: "GigabitEthernet1/0/8",
      bInterface: "GigabitEthernet0/0",
      kind: "bgp-session",
      bandwidthMbps: 1000,
      betweenSites: [hqCity.id, "SITE-CLOUD-VPC"],
    });
  }

  graph.addExplanation({
    id: "TOPO.GLOBAL-WAN-MESH",
    module: "topology",
    rule: "TOPO.04",
    decision: "Constructed hub-and-spoke WAN with IPsec tunnels and Cloud VPC gateway",
    rationale: "Hub-and-spoke topology with IPsec VPN connectivity enables cost-effective WAN integration of 2,000 distributed IoT nodes with secure VPC aggregation.",
    inputs: { citiesCount: cities.length, cloudProvider: cloudVpc?.provider },
    references: ["RFC 4301 IPsec Architecture", "RFC 4271 BGP-4"],
  });

  return graph;
}

/**
 * Main entrypoint to build a network topology from a TopologyRequest.
 */
export function buildTopology(
  request: TopologyRequest,
  options?: TopologyBuilderOptions,
): Topology {
  let graph: NetworkGraph;

  switch (request.profileShape.profile) {
    case "campus-lan":
      graph = buildCampusTopology(
        request.profileShape.buildings,
        request.mediaByRole,
        options,
      );
      break;

    case "metro-man":
      graph = buildMetroTopology(
        request.profileShape.sites,
        request.profileShape.dualHomedFailover ?? true,
        request.profileShape.evplBandwidthMbps ?? 200,
      );
      break;

    case "global-wan":
      graph = buildGlobalWanTopology(
        request.profileShape.cities,
        request.profileShape.cloudVpc,
      );
      break;
  }

  return graph.toTopology();
}
