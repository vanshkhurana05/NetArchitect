/**
 * Route Summarization Utility.
 * Computes minimal covering CIDR supernets across subnet collections
 * and detects route summary overlaps.
 * OWNER: Routing specialist agent (src/engines/routing/).
 */
import type { SubnetPlanItem } from "../../contracts/vlsm.js";
import {
  ipToUint32,
  uint32ToIp,
  prefixToMaskInt,
  prefixToMaskString,
  prefixToWildcardString,
  totalAddresses,
} from "../vlsm/bits.js";
import type { RouteSummaryCandidate, SummaryOverlapCheckResult } from "./types.js";
import { RoutingValidationError } from "./types.js";

/**
 * Calculates the minimal covering CIDR supernet that encloses all provided subnets.
 */
export function calculateRouteSummary(
  subnets: SubnetPlanItem[],
  areaId?: number,
): RouteSummaryCandidate {
  if (subnets.length === 0) {
    throw new RoutingValidationError(
      "EMPTY_SUBNET_LIST",
      "Cannot calculate route summary for an empty subnet list.",
    );
  }

  if (subnets.length === 1) {
    const s = subnets[0]!;
    const result: RouteSummaryCandidate = {
      summaryCidr: `${s.network}/${s.prefix}`,
      baseNetwork: s.network,
      prefix: s.prefix,
      netmask: s.mask,
      wildcard: s.wildcard,
      encompassedSubnets: [s.name],
    };
    if (areaId !== undefined) result.areaId = areaId;
    return result;
  }

  // Find minimum starting IP and maximum ending IP across all subnets
  let minBase = 0xFFFFFFFF;
  let maxEnd = 0;

  for (const s of subnets) {
    const base = ipToUint32(s.network);
    if (base === null) {
      throw new RoutingValidationError("MALFORMED_IP", `Invalid subnet network IP: "${s.network}".`);
    }
    const size = totalAddresses(s.prefix);
    const end = base + size - 1;

    if (base < minBase) minBase = base;
    if (end > maxEnd) maxEnd = end;
  }

  // Find common leading bits between minBase and maxEnd
  // XOR gives 1s where bits differ; Math.clz32 gives leading 0s
  const diff = (minBase ^ maxEnd) >>> 0;
  const commonBits = diff === 0 ? 32 : Math.clz32(diff);
  const summaryPrefix = commonBits;

  const maskInt = prefixToMaskInt(summaryPrefix);
  const summaryBaseInt = (minBase & maskInt) >>> 0;
  const summaryBase = uint32ToIp(summaryBaseInt);

  const candidate: RouteSummaryCandidate = {
    summaryCidr: `${summaryBase}/${summaryPrefix}`,
    baseNetwork: summaryBase,
    prefix: summaryPrefix,
    netmask: prefixToMaskString(summaryPrefix),
    wildcard: prefixToWildcardString(summaryPrefix),
    encompassedSubnets: subnets.map((s) => s.name),
  };
  if (areaId !== undefined) candidate.areaId = areaId;
  return candidate;
}

/**
 * Detects whether any two candidate route summaries overlap or collide.
 */
export function detectOverlappingSummaries(
  summaries: RouteSummaryCandidate[],
): SummaryOverlapCheckResult {
  const overlappingPairs: SummaryOverlapCheckResult["overlappingPairs"] = [];

  for (let i = 0; i < summaries.length; i++) {
    for (let j = i + 1; j < summaries.length; j++) {
      const sumA = summaries[i]!;
      const sumB = summaries[j]!;

      const baseA = ipToUint32(sumA.baseNetwork)!;
      const endA = baseA + totalAddresses(sumA.prefix) - 1;

      const baseB = ipToUint32(sumB.baseNetwork)!;
      const endB = baseB + totalAddresses(sumB.prefix) - 1;

      // Overlap condition: intervals [baseA, endA] and [baseB, endB] intersect
      if (Math.max(baseA, baseB) <= Math.min(endA, endB)) {
        overlappingPairs.push({
          summaryA: sumA.summaryCidr,
          summaryB: sumB.summaryCidr,
          detail: `Summary ${sumA.summaryCidr} (Area ${sumA.areaId ?? "?"}) overlaps with ${sumB.summaryCidr} (Area ${sumB.areaId ?? "?"}).`,
        });
      }
    }
  }

  return {
    hasOverlap: overlappingPairs.length > 0,
    overlappingPairs,
  };
}
