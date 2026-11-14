/**
 * OSPF Area and Network Advertisement Planner.
 * Plans Area 0, remote areas, network statements, wildcard masks, and ABR summaries.
 */
import type { OspfAreaPlan } from "../../contracts/routing.js";
import type { SubnetPlanItem } from "../../contracts/vlsm.js";
import type { Device, Site } from "../../contracts/topology.js";
import { calculateRouteSummary } from "./summarization.js";
import { RoutingValidationError } from "./types.js";

export interface OspfPlanningOptions {
  multiArea?: boolean;
  summarizeAtAbr?: boolean;
}

/**
 * Plans OSPF areas, network statements with exact wildcards, and ABR route summaries.
 */
export function planOspfAreas(
  profile: "campus-lan" | "metro-man" | "global-wan",
  sites: Site[],
  devices: Device[],
  subnets: SubnetPlanItem[],
  options?: OspfPlanningOptions,
): OspfAreaPlan[] {
  if (subnets.length === 0) {
    throw new RoutingValidationError("EMPTY_SUBNETS", "Cannot plan OSPF without allocated subnets.");
  }

  // 1. Check for duplicate network advertisements across the subnets
  const seenNetworks = new Set<string>();
  for (const s of subnets) {
    const netKey = `${s.network}/${s.prefix}`;
    if (seenNetworks.has(netKey)) {
      throw new RoutingValidationError(
        "DUPLICATE_NETWORK_ADVERTISEMENT",
        `Duplicate subnet detected in plan: ${netKey}. OSPF network advertisements must be unique.`,
      );
    }
    seenNetworks.add(netKey);
  }

  // 2. Identify L3 routing devices
  const routerDevices = devices.filter(
    (d) =>
      d.role === "core-switch" ||
      d.role === "edge-router" ||
      d.role === "wan-router",
  );

  if (routerDevices.length === 0) {
    throw new RoutingValidationError(
      "MISSING_ROUTER_INTERFACES",
      "No Layer-3 routing devices found in topology to run OSPF process.",
    );
  }

  const multiArea = options?.multiArea ?? profile !== "campus-lan";

  // Case A: Single-Area OSPF (Area 0)
  if (!multiArea) {
    const area0Networks = subnets.map((s) => ({
      cidr: `${s.network}/${s.prefix}`,
      wildcard: s.wildcard,
    }));

    return [
      {
        areaId: 0,
        label: "Backbone Area 0",
        siteIds: sites.map((s) => s.id),
        networks: area0Networks,
      },
    ];
  }

  // Case B: Multi-Area OSPF
  // Area 0 for HQ / Core site; Area 10, Area 20, etc. for remote sites
  const areas: OspfAreaPlan[] = [];
  const hqSite = sites.find((s) => s.id.includes("HQ") || s.id.includes("CORE")) ?? sites[0]!;
  const remoteSites = sites.filter((s) => s.id !== hqSite.id);

  // Split subnets across areas:
  // Subnets matching remote sites go to remote areas, remainder to Area 0
  const subnetsPerSite = new Map<string, SubnetPlanItem[]>();
  subnetsPerSite.set(hqSite.id, []);
  for (const r of remoteSites) {
    subnetsPerSite.set(r.id, []);
  }

  // Distribute subnets to sites based on name or round-robin
  for (const sub of subnets) {
    let assigned = false;
    for (const site of sites) {
      if (sub.name.toUpperCase().includes(site.id.toUpperCase())) {
        subnetsPerSite.get(site.id)?.push(sub);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      // Default to HQ site
      subnetsPerSite.get(hqSite.id)?.push(sub);
    }
  }

  // Area 0 Plan
  const area0Subnets = subnetsPerSite.get(hqSite.id) ?? [];
  const area0Networks = (area0Subnets.length > 0 ? area0Subnets : subnets).map((s) => ({
    cidr: `${s.network}/${s.prefix}`,
    wildcard: s.wildcard,
  }));

  areas.push({
    areaId: 0,
    label: `Backbone Area 0 (${hqSite.label})`,
    siteIds: [hqSite.id],
    networks: area0Networks,
  });

  // Remote Areas (Area 10, Area 20, etc.)
  let areaCounter = 10;
  for (const rSite of remoteSites) {
    const siteSubnets = subnetsPerSite.get(rSite.id) ?? [];
    if (siteSubnets.length === 0) continue;

    const networks = siteSubnets.map((s) => ({
      cidr: `${s.network}/${s.prefix}`,
      wildcard: s.wildcard,
    }));

    // Find Area Border Router connecting Area 0 and remote area
    const abr =
      routerDevices.find((d) => d.siteId === rSite.id) ??
      routerDevices.find((d) => d.siteId === hqSite.id) ??
      routerDevices[0]!;

    let summaryRoutes: OspfAreaPlan["summaryRoutes"];
    if (options?.summarizeAtAbr !== false && siteSubnets.length > 0) {
      const summary = calculateRouteSummary(siteSubnets, areaCounter);
      summaryRoutes = [
        {
          abrDeviceId: abr.id,
          summaryCidr: summary.summaryCidr,
        },
      ];
    }

    const areaPlan: OspfAreaPlan = {
      areaId: areaCounter,
      label: `Stub/Standard Area ${areaCounter} (${rSite.label})`,
      siteIds: [rSite.id],
      networks,
    };
    if (summaryRoutes) {
      areaPlan.summaryRoutes = summaryRoutes;
    }

    areas.push(areaPlan);
    areaCounter += 10;
  }

  return areas;
}
