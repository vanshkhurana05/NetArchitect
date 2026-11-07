/**
 * VLAN planning engine.
 * Plans 802.1Q VLAN IDs, trunk allowed lists, native VLAN hardening,
 * access port assignments, and SVI layer-3 routing interfaces.
 * OWNER: VLAN specialist agent (src/engines/vlan/).
 */
import type {
  VlanEngineInput,
  VlanItem,
  VlanPlan,
  TrunkPlan,
} from "../../contracts/vlan.js";
import type { ExplainRecord } from "../../contracts/explain.js";
import type {
  VlanAssignment,
  AccessPortAssignment,
  VlanPlanningResult,
  VlanPlannerOptions,
} from "./types.js";
import {
  NATIVE_VLAN_ID,
  DEFAULT_VLAN_START_ID,
  DEFAULT_VLAN_INCREMENT,
} from "./types.js";
import { deriveVlsmRequests } from "./vlsm-adapter.js";

/**
 * Plans 802.1Q VLAN allocations, trunk boundaries, and SVI mappings.
 */
export function planVlans(
  input: VlanEngineInput,
  options?: VlanPlannerOptions,
): VlanPlanningResult {
  const startId = options?.startVlanId ?? DEFAULT_VLAN_START_ID;
  const increment = options?.increment ?? DEFAULT_VLAN_INCREMENT;
  const nativeVlan = options?.nativeVlanId ?? NATIVE_VLAN_ID;

  const items: VlanItem[] = [];
  const assignments: VlanAssignment[] = [];
  const explanations: ExplainRecord[] = [];

  let currentVlanId = startId;

  // 1. Assign deterministic VLAN IDs
  for (const req of input.requests) {
    // If collision with native VLAN 99 or reserved VLAN 1, advance
    while (currentVlanId === 1 || currentVlanId === nativeVlan) {
      currentVlanId += increment;
    }

    const subnetName = `${req.name}-NET`;
    const isMgmt = req.purpose === "management" || req.name.toLowerCase().includes("mgmt");

    const item: VlanItem = {
      vlanId: currentVlanId,
      name: req.name,
      purpose: req.purpose,
      subnetName,
    };
    items.push(item);

    assignments.push({
      ...item,
      hosts: req.hosts,
      department: req.purpose.charAt(0).toUpperCase() + req.purpose.slice(1),
      siteIds: [...input.siteIds],
      isManagement: isMgmt,
    });

    currentVlanId += increment;
  }

  // 2. Trunk Planning: Configure allowed VLANs and native VLAN 99
  const trunks: TrunkPlan[] = [];
  const allVlanIds = items.map((i) => i.vlanId);

  if (input.links && input.links.length > 0) {
    for (const link of input.links) {
      // Inter-switch and switch-router links are designated as 802.1Q trunks
      const isTrunkCandidate =
        link.kind === "physical" ||
        link.id.includes("CORE") ||
        link.id.includes("DIST") ||
        link.id.includes("ACC") ||
        link.id.includes("ROUTER-SWITCH");

      if (isTrunkCandidate) {
        trunks.push({
          linkId: link.id,
          allowedVlanIds: [...allVlanIds],
          nativeVlanId: nativeVlan,
        });
      }
    }
  }

  // 3. SVI Layer-3 Interfaces
  const svis: Array<{ deviceId: string; vlanId: number; ipCidr: string }> = [];
  if (input.devices && input.devices.length > 0) {
    const l3Devices = input.devices.filter(
      (d) =>
        d.role === "core-switch" ||
        d.role === "edge-router" ||
        d.role === "wan-router",
    );

    for (const dev of l3Devices) {
      for (const item of items) {
        svis.push({
          deviceId: dev.id,
          vlanId: item.vlanId,
          ipCidr: "TBD", // To be bound to the first host of the carved VLSM subnet
        });
      }
    }
  }

  // 4. Access Port Mapping for Access Switches
  const accessPorts: AccessPortAssignment[] = [];
  if (input.devices && input.devices.length > 0) {
    const accessSwitches = input.devices.filter((d) => d.role === "access-switch");
    const clientVlans = items.filter((i) => i.purpose !== "management");

    for (const sw of accessSwitches) {
      const portCount = sw.portCount ?? 48;
      const usableAccessPorts = Math.max(1, portCount - 4); // reserve 4 uplink ports
      const portsPerVlan = Math.max(1, Math.floor(usableAccessPorts / Math.max(1, clientVlans.length)));

      let startPort = 1;
      for (const vlan of clientVlans) {
        const endPort = Math.min(usableAccessPorts, startPort + portsPerVlan - 1);
        accessPorts.push({
          deviceId: sw.id,
          portRange: `FastEthernet0/${startPort}-${endPort}`,
          vlanId: vlan.vlanId,
          vlanName: vlan.name,
        });
        startPort = endPort + 1;
      }
    }
  }

  // 5. Explainability Records
  explanations.push({
    id: "VLAN.DETERMINISTIC-TAGS",
    module: "vlan",
    rule: "VLAN.01",
    decision: `Assigned deterministic 802.1Q tags starting at ${startId} (+${increment})`,
    rationale: "Standardized VLAN numbering ensures uniform broadcast domain mapping across campus switches and prevents conflicting PVIDs.",
    inputs: { totalVlans: items.length, startId, increment },
    references: ["IEEE 802.1Q", "Cisco Campus LAN Best Practices"],
  });

  explanations.push({
    id: "VLAN.NATIVE-HARDENING",
    module: "vlan",
    rule: "VLAN.02",
    decision: `Configured Native VLAN ${nativeVlan} as untagged and unused on all trunks`,
    rationale: "Setting the native VLAN to an unused ID (VLAN 99) and disallowing default VLAN 1 mitigates 802.1Q double-tagging and VLAN hopping security vulnerabilities.",
    inputs: { nativeVlanId: nativeVlan, defaultVlanDisabled: 1 },
    references: ["NIST SP 800-115", "DISA Network Infrastructure STIG"],
  });

  explanations.push({
    id: "VLAN.TRUNK-PRUNING",
    module: "vlan",
    rule: "VLAN.03",
    decision: `Restricted trunk links to explicitly allowed VLAN list [${allVlanIds.join(",")}]`,
    rationale: "Explicit allowed-VLAN pruning confines broadcast/multicast traffic strictly to authorized switches, conserving backplane bandwidth.",
    inputs: { allowedVlanIds: allVlanIds },
    references: ["IEEE 802.1Q Clause 9", "RFC 3069"],
  });

  const vlanPlan: VlanPlan = {
    items,
    trunks,
    svis,
    explanations,
  };

  const vlsmRequests = deriveVlsmRequests(items, input.requests);

  return {
    vlanPlan,
    assignments,
    accessPorts,
    vlsmRequests,
  };
}
