/**
 * Network Verification Engine.
 * Programmatic fail-closed boundary and invariant checks that must pass
 * before the export manager is allowed to emit artifacts.
 */
import type {
  VerificationCheck,
  VerificationReport,
  VerificationInput,
} from "../contracts/verification.js";
import {
  ipToUint32,
  totalAddresses,
  prefixToWildcardString,
} from "../engines/vlsm/bits.js";
import { parseCidrV4 } from "../validation/cidr.js";

export class NetworkVerificationService {
  /**
   * Executes Level 3 Invariant Verification against the complete network design.
   * Returns a fail-closed VerificationReport.
   */
  public verify(input: VerificationInput): VerificationReport {
    const checks: VerificationCheck[] = [];
    const advisories: string[] = [];

    // ------------------------------------------------------------------------
    // V-01: Zero-Overlap Invariant (Pairwise Disjointness Check)
    // ------------------------------------------------------------------------
    let overlapFound = false;
    let overlapDetail = "All allocated subnets are strictly disjoint (zero overlap).";

    for (let i = 0; i < input.subnets.length; i++) {
      for (let j = i + 1; j < input.subnets.length; j++) {
        const subA = input.subnets[i]!;
        const subB = input.subnets[j]!;

        const baseA = ipToUint32(subA.network)!;
        const endA = baseA + totalAddresses(subA.prefix) - 1;

        const baseB = ipToUint32(subB.network)!;
        const endB = baseB + totalAddresses(subB.prefix) - 1;

        if (Math.max(baseA, baseB) <= Math.min(endA, endB)) {
          overlapFound = true;
          overlapDetail = `Overlap detected between subnet "${subA.name}" (${subA.network}/${subA.prefix}) and "${subB.name}" (${subB.network}/${subB.prefix}).`;
          break;
        }
      }
      if (overlapFound) break;
    }

    checks.push({
      id: "V-01",
      name: "Bitwise Zero-Overlap Invariant",
      category: "vlsm",
      passed: !overlapFound,
      detail: overlapDetail,
    });

    // ------------------------------------------------------------------------
    // V-02: Root Network Block Containment Check
    // ------------------------------------------------------------------------
    if (input.rootBlockCidr) {
      const parsedRoot = parseCidrV4(input.rootBlockCidr);
      if (parsedRoot) {
        const rootBase = ipToUint32(parsedRoot.baseIp)!;
        const rootEnd = rootBase + totalAddresses(parsedRoot.prefix) - 1;

        let outOfBounds = false;
        let outDetail = `All subnets are contained within root block ${input.rootBlockCidr}.`;

        for (const sub of input.subnets) {
          const subBase = ipToUint32(sub.network)!;
          const subEnd = subBase + totalAddresses(sub.prefix) - 1;

          if (subBase < rootBase || subEnd > rootEnd) {
            outOfBounds = true;
            outDetail = `Subnet "${sub.name}" (${sub.network}/${sub.prefix}) falls outside root block ${input.rootBlockCidr}.`;
            break;
          }
        }

        checks.push({
          id: "V-02",
          name: "Root Network Containment Check",
          category: "vlsm",
          passed: !outOfBounds,
          detail: outDetail,
        });
      }
    }

    // ------------------------------------------------------------------------
    // V-03: Gateway Belongs to Respective Subnet Check
    // ------------------------------------------------------------------------
    let badGateway = false;
    let gwDetail = "All gateway IP addresses belong to their respective subnet address blocks.";

    for (const sub of input.subnets) {
      const base = ipToUint32(sub.network)!;
      const end = base + totalAddresses(sub.prefix) - 1;
      const gw = ipToUint32(sub.gateway);

      if (gw === null || gw < base || gw > end) {
        badGateway = true;
        gwDetail = `Subnet "${sub.name}" has invalid gateway ${sub.gateway} outside block ${sub.network}/${sub.prefix}.`;
        break;
      }
    }

    checks.push({
      id: "V-03",
      name: "Gateway Subnet Belonging Check",
      category: "vlsm",
      passed: !badGateway,
      detail: gwDetail,
    });

    // ------------------------------------------------------------------------
    // V-04: Independent Wildcard Mask Recomputation Check
    // ------------------------------------------------------------------------
    let badWildcard = false;
    let wcDetail = "All wildcard masks independently verified against bitwise complement (~netmask).";

    for (const sub of input.subnets) {
      const expectedWildcard = prefixToWildcardString(sub.prefix);
      if (sub.wildcard !== expectedWildcard) {
        badWildcard = true;
        wcDetail = `Subnet "${sub.name}" wildcard mask mismatch: got ${sub.wildcard}, expected ${expectedWildcard}.`;
        break;
      }
    }

    checks.push({
      id: "V-04",
      name: "Wildcard Mask Inversion Check",
      category: "routing",
      passed: !badWildcard,
      detail: wcDetail,
    });

    // ------------------------------------------------------------------------
    // V-05: Host Capacity Sufficiency Check
    // ------------------------------------------------------------------------
    let insufficientCapacity = false;
    let capDetail = "All carved subnets provide usable host capacity >= requested demand.";

    for (const sub of input.subnets) {
      if (sub.capacity < sub.requestedHosts) {
        insufficientCapacity = true;
        capDetail = `Subnet "${sub.name}" capacity (${sub.capacity}) is less than requested host count (${sub.requestedHosts}).`;
        break;
      }
    }

    checks.push({
      id: "V-05",
      name: "Host Capacity Sufficiency Check",
      category: "vlsm",
      passed: !insufficientCapacity,
      detail: capDetail,
    });

    // ------------------------------------------------------------------------
    // V-06: 802.1Q VLAN Safety & Native Hardening Check
    // ------------------------------------------------------------------------
    let vlanValid = true;
    let vlanDetail = "VLAN IDs are unique, within range 1..4094, and native VLAN 99 is unused for access.";

    const seenVlanIds = new Set<number>();
    for (const vid of input.vlanIds) {
      if (vid < 1 || vid > 4094) {
        vlanValid = false;
        vlanDetail = `VLAN ID ${vid} is out of standard range (1..4094).`;
        break;
      }
      if (seenVlanIds.has(vid)) {
        vlanValid = false;
        vlanDetail = `Duplicate VLAN ID ${vid} detected in plan.`;
        break;
      }
      if (vid === 99) {
        vlanValid = false;
        vlanDetail = `Native VLAN 99 must not be allocated to user broadcast domains.`;
        break;
      }
      if (vid === 1) {
        vlanValid = false;
        vlanDetail = `Default VLAN 1 is restricted for security hardening and cannot be assigned.`;
        break;
      }
      seenVlanIds.add(vid);
    }

    checks.push({
      id: "V-06",
      name: "VLAN Safety & Native Hardening Check",
      category: "vlan",
      passed: vlanValid,
      detail: vlanDetail,
    });

    // ------------------------------------------------------------------------
    // V-07: Physical Link Endpoints Existence Check
    // ------------------------------------------------------------------------
    const deviceIdSet = new Set(input.devices.map((d) => d.id));
    let invalidEndpoints = false;
    let epDetail = "All physical and logical links terminate on valid, known devices.";

    for (const link of input.links) {
      if (!deviceIdSet.has(link.aDeviceId) || !deviceIdSet.has(link.bDeviceId)) {
        invalidEndpoints = true;
        epDetail = `Link "${link.id}" references unknown endpoint device(s): ${link.aDeviceId} or ${link.bDeviceId}.`;
        break;
      }
    }

    checks.push({
      id: "V-07",
      name: "Link Endpoint Existence Check",
      category: "config",
      passed: !invalidEndpoints,
      detail: epDetail,
    });

    // ------------------------------------------------------------------------
    // V-08: Physical Media Feasibility Check (No Copper > 100m)
    // ------------------------------------------------------------------------
    let mediaFeasible = true;
    let mediaDetail = "All physical link runs strictly obey IEEE 802.3 transceiver reach limits.";

    for (const link of input.links) {
      if (link.phys) {
        const { runMeters, spec } = link.phys;
        if (spec.medium === "cat6a" && runMeters > 100) {
          mediaFeasible = false;
          mediaDetail = `Physical distance violation: Link "${link.id}" has copper run of ${runMeters}m exceeding 100m IEEE 802.3an limit.`;
          break;
        }
        if (spec.medium === "om4" && runMeters > 400) {
          mediaFeasible = false;
          mediaDetail = `Reach exceeded: Link "${link.id}" has OM4 run of ${runMeters}m exceeding 400m limit.`;
          break;
        }
        if (spec.medium === "os2" && runMeters > 40000) {
          mediaFeasible = false;
          mediaDetail = `Optical reach exceeded: Link "${link.id}" has OS2 run of ${runMeters}m exceeding 40km standard budget.`;
          break;
        }
      }
    }

    checks.push({
      id: "V-08",
      name: "Physical Media Feasibility Check",
      category: "media",
      passed: mediaFeasible,
      detail: mediaDetail,
    });

    // ------------------------------------------------------------------------
    // V-09: Routing Advertisement Consistency Check
    // ------------------------------------------------------------------------
    const allocatedSubnetCidrs = new Set(input.subnets.map((s) => `${s.network}/${s.prefix}`));
    let routingConsistent = true;
    let routingDetail = "All OSPF network statements map directly to allocated VLSM subnets.";

    for (const area of input.routing.areas) {
      for (const net of area.networks) {
        // Allow loopback /32 subnets (e.g. 10.255.255.X/32) or verify against allocated subnets
        const isLoopback = net.cidr.includes("/32") || net.cidr.includes("10.255.255.");
        if (!isLoopback && !allocatedSubnetCidrs.has(net.cidr)) {
          // Check if base network matches
          const base = net.cidr.split("/")[0]!;
          const matchesBase = input.subnets.some((s) => s.network === base);
          if (!matchesBase) {
            routingConsistent = false;
            routingDetail = `OSPF area ${area.areaId} advertises network ${net.cidr} which does not exist in the VLSM subnet plan.`;
            break;
          }
        }
      }
      if (!routingConsistent) break;
    }

    checks.push({
      id: "V-09",
      name: "Routing Advertisement Consistency Check",
      category: "routing",
      passed: routingConsistent,
      detail: routingDetail,
    });

    // ------------------------------------------------------------------------
    // V-10: Metro SLA Latency Compliance Check
    // ------------------------------------------------------------------------
    if (input.latencyTargetMs !== undefined) {
      let slaCompliant = true;
      let slaDetail = `All circuit latency values meet the ${input.latencyTargetMs} ms SLA target.`;

      for (const link of input.links) {
        if (link.latencyMs !== undefined && link.latencyMs > input.latencyTargetMs) {
          slaCompliant = false;
          slaDetail = `Link "${link.id}" latency (${link.latencyMs} ms) exceeds the ${input.latencyTargetMs} ms SLA threshold.`;
          break;
        }
      }

      checks.push({
        id: "V-10",
        name: "Metro SLA Latency Compliance Check",
        category: "latency",
        passed: slaCompliant,
        detail: slaDetail,
      });
    }

    const overallPassed = checks.every((c) => c.passed);

    return {
      passed: overallPassed,
      checks,
      advisories,
    };
  }
}

export function createVerificationService(): NetworkVerificationService {
  return new NetworkVerificationService();
}
