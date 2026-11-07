/**
 * Switch Configuration Generator.
 * Populates switchports (access vs trunk), allowed VLAN lists, native VLAN 99,
 * and Rapid Spanning Tree (RSTP / rapid-pvst).
 * OWNER: Configuration Generator Agent (src/configuration/).
 */
import type { Device, Link } from "../../contracts/topology.js";
import type { VlanPlan } from "../../contracts/vlan.js";
import type {
  InterfaceConfigModel,
  SpanningTreeConfigModel,
} from "../model.js";

/**
 * Builds switch interface configurations for access, distribution, or core switches.
 */
export function generateSwitchInterfaces(
  device: Device,
  links: Link[],
  vlanPlan: VlanPlan,
): InterfaceConfigModel[] {
  const ifaces: InterfaceConfigModel[] = [];
  const portCount = device.portCount ?? 24;
  const isAccess = device.role === "access-switch";
  const isCore = device.role === "core-switch";
  const isDist = device.role === "distribution-switch";

  // Find all links connected to this device
  const connectedLinks = links.filter(
    (l) => l.aDeviceId === device.id || l.bDeviceId === device.id,
  );

  // Map of trunk configs by linkId
  const trunkMap = new Map<string, { allowedVlans: number[]; nativeVlan: number }>();
  for (const t of vlanPlan.trunks) {
    trunkMap.set(t.linkId, { allowedVlans: t.allowedVlanIds, nativeVlan: t.nativeVlanId });
  }

  // 1. Configure connected trunk and uplink interfaces
  let portIdx = 1;
  for (const link of connectedLinks) {
    const isTrunk = trunkMap.has(link.id) || !isAccess || link.id.includes("CORE") || link.id.includes("DIST");
    const otherDevId = link.aDeviceId === device.id ? link.bDeviceId : link.aDeviceId;

    const prefix = isCore || isDist ? "TenGigabitEthernet1/0/" : "GigabitEthernet1/0/";
    const portName = `${prefix}${portIdx}`;

    if (isTrunk) {
      const trunkInfo = trunkMap.get(link.id) ?? {
        allowedVlans: vlanPlan.items.map((v) => v.vlanId),
        nativeVlan: 99,
      };

      ifaces.push({
        name: portName,
        description: `Trunk link to ${otherDevId} (${link.id})`,
        enabled: true,
        mode: "trunk",
        trunkAllowedVlans: trunkInfo.allowedVlans,
        nativeVlan: trunkInfo.nativeVlan,
      });
    } else {
      // Access uplink
      ifaces.push({
        name: portName,
        description: `Uplink to ${otherDevId}`,
        enabled: true,
        mode: "access",
        accessVlan: vlanPlan.items[0]?.vlanId ?? 10,
      });
    }

    portIdx++;
  }

  // 2. Configure remaining access ports on access switches
  if (isAccess) {
    const clientVlans = vlanPlan.items.filter((v) => v.purpose !== "management");
    let currentVlanIdx = 0;

    for (let p = portIdx; p <= portCount - 4; p++) {
      const assignedVlan = clientVlans[currentVlanIdx % clientVlans.length]?.vlanId ?? 10;
      ifaces.push({
        name: `FastEthernet0/${p}`,
        description: `Access Port (VLAN ${assignedVlan})`,
        enabled: true,
        mode: "access",
        accessVlan: assignedVlan,
      });
      currentVlanIdx++;
    }
  }

  return ifaces;
}

/**
 * Builds Spanning Tree configuration: Rapid-PVST (RSTP), root priorities, and BPDU guard.
 */
export function generateSpanningTreeConfig(device: Device): SpanningTreeConfigModel {
  const isCore1 = device.id.includes("CORE-01") || device.id === "CORE-01";
  const isCore2 = device.id.includes("CORE-02") || device.id === "CORE-02";
  const isAccess = device.role === "access-switch";

  let priority: number | undefined;
  if (isCore1) {
    priority = 4096; // Primary Root Bridge
  } else if (isCore2) {
    priority = 8192; // Secondary Root Bridge
  }

  const config: SpanningTreeConfigModel = {
    mode: "rapid-pvst",
    portfastDefault: isAccess,
    bpduguardDefault: isAccess,
  };
  if (priority !== undefined) {
    config.priority = priority;
  }
  return config;
}
