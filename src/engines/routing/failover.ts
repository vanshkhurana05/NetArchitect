/**
 * Redundant Path and Route Failover Planner.
 * Computes primary and backup paths, metric steering, and SLA latency targets.
 * OWNER: Routing specialist agent (src/engines/routing/).
 */
import type { Link } from "../../contracts/topology.js";
import type { RedundantPathPlan } from "./types.js";

/**
 * Plans redundant paths and metric-based failover for multi-site EVPL and WAN circuits.
 */
export function planRedundantPaths(
  links: Link[],
  latencyTargetMs: number = 5,
): RedundantPathPlan[] {
  const plans: RedundantPathPlan[] = [];

  // Group links by site pair
  const siteLinks = new Map<string, Link[]>();
  for (const l of links) {
    if (l.betweenSites) {
      const key = `${l.betweenSites[0]}<->${l.betweenSites[1]}`;
      const list = siteLinks.get(key) ?? [];
      list.push(l);
      siteLinks.set(key, list);
    }
  }

  for (const [siteKey, pairLinks] of siteLinks.entries()) {
    if (pairLinks.length >= 2) {
      const primaryLink = pairLinks.find((l) => l.id.includes("PRI")) ?? pairLinks[0]!;
      const backupLink = pairLinks.find((l) => l.id.includes("SEC")) ?? pairLinks[1]!;

      plans.push({
        siteId: siteKey,
        primaryLinkId: primaryLink.id,
        backupLinkId: backupLink.id,
        primaryMetric: 10,
        backupMetric: 20, // Higher metric for deterministic floating failover
        failoverMechanism: "evpl-dual-homed",
        targetSlaMs: latencyTargetMs,
      });
    }
  }

  return plans;
}
