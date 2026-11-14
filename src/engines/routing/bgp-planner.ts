/**
 * BGP Peering and Autonomous System Planner.
 * Enforces external BGP (eBGP) between distinct autonomous systems.
 */
import type { BgpSession } from "../../contracts/routing.js";
import type { Device } from "../../contracts/topology.js";
import type { SubnetPlanItem } from "../../contracts/vlsm.js";
import { validateAsn } from "./protocol-chooser.js";
import { calculateRouteSummary } from "./summarization.js";
import { RoutingValidationError } from "./types.js";

export interface BgpPlanningInput {
  localAsNumber: number;
  remoteAsNumber: number;
  devices: Device[];
  subnets: SubnetPlanItem[];
  cloudVpc?: {
    provider: string;
    vpcCidr: string;
    vpnPeerPublicIps: string[];
    iotNodes?: number;
  };
}

/**
 * Plans eBGP sessions between the enterprise border router and Cloud VPC.
 */
export function planBgpSessions(input: BgpPlanningInput): BgpSession[] {
  // 1. Validate both Autonomous System numbers
  validateAsn(input.localAsNumber, "localAsNumber");
  validateAsn(input.remoteAsNumber, "remoteAsNumber");

  // 2. Strict AS Boundary check: eBGP requires distinct autonomous systems!
  if (input.localAsNumber === input.remoteAsNumber) {
    throw new RoutingValidationError(
      "SAME_AS_EBGP_VIOLATION",
      `eBGP requires distinct autonomous systems. Local AS (${input.localAsNumber}) and Remote AS (${input.remoteAsNumber}) cannot be identical.`,
    );
  }

  // 3. Find border router
  const borderRouter =
    input.devices.find((d) => d.role === "wan-router" && (d.siteId.includes("HQ") || d.siteId.includes("D"))) ??
    input.devices.find((d) => d.role === "wan-router" || d.role === "edge-router");

  if (!borderRouter) {
    throw new RoutingValidationError(
      "MISSING_BORDER_ROUTER",
      "No WAN border router found in topology to establish BGP peering.",
    );
  }

  // 4. Resolve neighbor IP from Cloud VPC configuration
  if (!input.cloudVpc || input.cloudVpc.vpnPeerPublicIps.length === 0) {
    return [];
  }

  const peerIp = input.cloudVpc.vpnPeerPublicIps[0]!;

  // 5. Compute advertised CIDRs using route summarization
  const summary = calculateRouteSummary(input.subnets);
  const advertiseCidrs = [summary.summaryCidr];

  return [
    {
      localDeviceId: borderRouter.id,
      neighborIp: peerIp,
      remoteAsNumber: input.remoteAsNumber,
      advertiseCidrs,
    },
  ];
}
