/**
 * Routing Engine Types & Domain Models.
 * OWNER: Routing specialist agent (src/engines/routing/).
 */
import type {
  RoutingPlan,
  OspfAreaPlan,
  BgpSession,
  VpnTunnel,
  QosPolicyClass,
  RoutingEngineInput,
} from "../../contracts/routing.js";
import type { SubnetPlanItem } from "../../contracts/vlsm.js";

export {
  RoutingPlan,
  OspfAreaPlan,
  BgpSession,
  VpnTunnel,
  QosPolicyClass,
  RoutingEngineInput,
};

export class RoutingValidationError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "RoutingValidationError";
    this.code = code;
  }
}

export interface RouteSummaryCandidate {
  summaryCidr: string; // e.g. "10.20.0.0/16"
  baseNetwork: string; // "10.20.0.0"
  prefix: number; // 16
  netmask: string; // "255.255.0.0"
  wildcard: string; // "0.0.255.255"
  encompassedSubnets: string[];
  areaId?: number;
}

export interface SummaryOverlapCheckResult {
  hasOverlap: boolean;
  overlappingPairs: Array<{
    summaryA: string;
    summaryB: string;
    detail: string;
  }>;
}

export interface RedundantPathPlan {
  siteId: string;
  primaryLinkId: string;
  backupLinkId: string;
  primaryMetric: number;
  backupMetric: number;
  failoverMechanism: "ospf-cost" | "floating-static" | "evpl-dual-homed";
  targetSlaMs?: number;
}

export interface RoutingPlannerOptions {
  maxSingleAreaSubnets?: number; // default 50 (assignment condition)
  cloudProviderAsn?: number; // default 64512 (RFC 6996 private ASN)
  enableRouteSummarization?: boolean;
}
