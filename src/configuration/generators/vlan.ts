/**
 * VLAN Configuration Generator.
 * Maps 802.1Q VLAN plans and SVIs into intermediate models.
 * OWNER: Configuration Generator Agent (src/configuration/).
 */
import type { VlanPlan } from "../../contracts/vlan.js";
import type { SubnetPlanItem } from "../../contracts/vlsm.js";
import type { VlanConfigModel, SviConfigModel } from "../model.js";

/**
 * Builds the VLAN database entries from a VlanPlan.
 */
export function generateVlanDatabase(vlanPlan: VlanPlan): VlanConfigModel[] {
  return vlanPlan.items.map((v) => ({
    vlanId: v.vlanId,
    name: v.name,
    state: "active",
  }));
}

/**
 * Builds Switch Virtual Interfaces (SVIs) for Layer-3 switches, binding
 * each VLAN to its carved subnet gateway IP address and mask from the VLSM plan.
 */
export function generateDeviceSvis(
  deviceId: string,
  vlanPlan: VlanPlan,
  subnets: SubnetPlanItem[],
): SviConfigModel[] {
  const svis: SviConfigModel[] = [];

  // Find all SVI requests targeted to this device
  const targetedSvis = vlanPlan.svis.filter((s) => s.deviceId === deviceId);
  const vlanMap = new Map<number, string>();
  for (const item of vlanPlan.items) {
    vlanMap.set(item.vlanId, item.name);
  }

  for (const t of targetedSvis) {
    const vlanName = vlanMap.get(t.vlanId) ?? `VLAN-${t.vlanId}`;
    // Find the matching subnet by name (e.g. "MGMT" matches "MGMT-NET" or "MGMT")
    const subnet =
      subnets.find((s) => s.name.toUpperCase().startsWith(vlanName.toUpperCase())) ??
      subnets.find((s) => s.name.includes(String(t.vlanId))) ??
      subnets[0];

    if (subnet) {
      svis.push({
        vlanId: t.vlanId,
        ipAddress: subnet.gateway, // First usable host address
        subnetMask: subnet.mask,
        description: `SVI Gateway for ${vlanName}`,
        enabled: true,
      });
    }
  }

  return svis;
}
