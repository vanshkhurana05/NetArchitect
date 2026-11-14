/**
 * Adapter converting VLAN requests to VLSM subnet requests.
 * Ensures the VLAN engine feeds the bitwise allocator rather than implementing its own IP logic.
 */
import type { VlanItem, VlanRequestItem } from "../../contracts/vlan.js";
import type { VlsmRequest } from "../../contracts/vlsm.js";

/**
 * Derives VlsmRequest items from planned VLAN items and original request host counts.
 */
export function deriveVlsmRequests(
  items: VlanItem[],
  requests: VlanRequestItem[],
): VlsmRequest[] {
  const reqMap = new Map<string, number>();
  for (const r of requests) {
    reqMap.set(r.name, r.hosts);
  }

  return items.map((item) => {
    const hosts = reqMap.get(item.name) ?? 20;
    return {
      name: item.subnetName,
      hosts,
    };
  });
}
