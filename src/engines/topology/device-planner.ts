/**
 * Device planner for Campus LAN and Enterprise networks.
 * Calculates switch and router counts using endpoint densities,
 * switch port capacities, reserved uplink ports, PoE, and growth headroom.
 */
import type { BuildingSpec } from "../../contracts/input.js";
import type { DevicePlanningConfig, BuildingPlanningResult } from "./types.js";

export const DEFAULT_PLANNING_CONFIG: DevicePlanningConfig = {
  accessSwitchPortCount: 48,
  distributionSwitchPortCount: 24,
  coreSwitchPortCount: 24,
  reservedUplinkPorts: 4, // 4 SFP/SFP+ ports reserved for distribution uplinks
  growthHeadroomPct: 20, // 20% growth buffer for campus endpoint drops
  endpointsPerAp: 24, // 1 wireless AP per 24 endpoints for Wi-Fi density
  poeEnabledForAccess: true, // Access switches require 802.3at PoE+
  redundantCore: true, // Collapsed core requires 2 redundant switches
};

/**
 * Plans switch requirements for a single campus building based on endpoint count,
 * port capacity, reserved ports, PoE, and growth headroom.
 */
export function planBuildingDevices(
  building: BuildingSpec,
  userConfig?: Partial<DevicePlanningConfig>,
): BuildingPlanningResult {
  const config: DevicePlanningConfig = { ...DEFAULT_PLANNING_CONFIG, ...userConfig };

  const usableAccessPortsPerSwitch = Math.max(1, config.accessSwitchPortCount - config.reservedUplinkPorts);
  const totalAccessPortsNeeded = Math.ceil(building.endpoints * (1 + config.growthHeadroomPct / 100));
  const accessSwitchesCount = Math.max(1, Math.ceil(totalAccessPortsNeeded / usableAccessPortsPerSwitch));
  const totalAccessPortsProvided = accessSwitchesCount * usableAccessPortsPerSwitch;

  const apCount = Math.max(1, Math.ceil(building.endpoints / config.endpointsPerAp));
  const poePortsNeeded = apCount; // All wireless APs require PoE power

  const distributionSwitchesCount = 1; // 1 distribution switch or stack per building

  const rationale: string[] = [
    `Building ${building.name} (${building.id}): ${building.endpoints} endpoints with ${config.growthHeadroomPct}% growth buffer require ${totalAccessPortsNeeded} active drops.`,
    `Using ${config.accessSwitchPortCount}-port switches with ${config.reservedUplinkPorts} reserved uplink ports yields ${usableAccessPortsPerSwitch} usable access ports per switch.`,
    `Allocated ${accessSwitchesCount} access switch(es) providing ${totalAccessPortsProvided} total access ports (${totalAccessPortsProvided - totalAccessPortsNeeded} spare ports).`,
    `Calculated ${apCount} PoE+ wireless access points (${config.endpointsPerAp} endpoints per AP).`,
    `Allocated ${distributionSwitchesCount} distribution switch/stack for building aggregation.`,
  ];

  return {
    siteId: building.id,
    siteName: building.name,
    endpoints: building.endpoints,
    apCount,
    accessSwitchesCount,
    distributionSwitchesCount,
    totalAccessPortsProvided,
    totalAccessPortsNeeded,
    poePortsNeeded,
    rationale,
  };
}

/**
 * Plans device requirements across all buildings in a Campus LAN.
 */
export function planCampusDevices(
  buildings: BuildingSpec[],
  userConfig?: Partial<DevicePlanningConfig>,
): BuildingPlanningResult[] {
  return buildings.map((b) => planBuildingDevices(b, userConfig));
}
