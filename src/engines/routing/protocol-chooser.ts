/**
 * Routing Protocol Chooser.
 * Algorithmic selection between single-area OSPF, multi-area OSPF, and OSPF+eBGP.
 * Enforces the assignment rule table and strict AS boundary criteria.
 * OWNER: Routing specialist agent (src/engines/routing/).
 */
import type { RoutingEngineInput } from "../../contracts/routing.js";
import type { ExplainRecord } from "../../contracts/explain.js";
import { RoutingValidationError } from "./types.js";

export interface ProtocolDecision {
  protocol: "single-area-ospf" | "multi-area-ospf" | "ospf-ebgp";
  explanation: ExplainRecord;
}

/**
 * Validates 32-bit autonomous system numbers per RFC 6793.
 */
export function validateAsn(asn: number, fieldName: string = "asNumber"): void {
  if (!Number.isInteger(asn) || !Number.isFinite(asn)) {
    throw new RoutingValidationError(
      "INVALID_AS_NUMBER",
      `${fieldName} must be a valid finite integer (got ${String(asn)}).`,
    );
  }
  if (asn <= 0 || asn > 4_294_967_295) {
    throw new RoutingValidationError(
      "INVALID_AS_NUMBER",
      `${fieldName} ${asn} is out of the valid 1..4294967295 range (RFC 6793).`,
    );
  }
  // Reserved AS numbers: 0 (RFC 7607)
  if (asn === 0) {
    throw new RoutingValidationError("INVALID_AS_NUMBER", "AS 0 is reserved by RFC 7607 and cannot be used.");
  }
}

/**
 * Chooses the Layer 3 routing architecture based on subnet density,
 * site topology, and autonomous system boundaries.
 */
export function chooseRoutingProtocol(
  input: RoutingEngineInput,
  maxSingleAreaSubnets: number = 50,
): ProtocolDecision {
  validateAsn(input.asNumber, "input.asNumber");

  const subnetCount = input.subnets.length;
  const hasCloudVpc = Boolean(input.cloudVpc);

  // Distinct AS evaluation: eBGP is selected ONLY when distinct autonomous systems exist!
  // It is NOT selected merely because multiple physical sites exist.
  if (hasCloudVpc && input.profile === "global-wan") {
    return {
      protocol: "ospf-ebgp",
      explanation: {
        id: "ROUTING.PROTOCOL.OSPF-EBGP",
        module: "routing",
        rule: "ROUTING.03",
        decision: "Selected OSPF + eBGP multi-domain routing architecture",
        rationale: `Enterprise Autonomous System AS ${input.asNumber} connects to external Cloud VPC boundary. eBGP handles policy-based inter-AS exchange (RFC 4271), while multi-area OSPF isolates internal enterprise areas.`,
        inputs: {
          asNumber: input.asNumber,
          subnetCount,
          cloudVpcProvider: input.cloudVpc?.provider,
          distinctAutonomousSystems: true,
        },
        references: ["RFC 4271 BGP-4", "RFC 4364 BGP/MPLS IP VPNs", "RFC 2328 OSPFv2"],
      },
    };
  }

  // Single AS: Check subnet threshold (< 50 vs >= 50) and multi-site requirements
  if (subnetCount < maxSingleAreaSubnets && input.profile === "campus-lan") {
    return {
      protocol: "single-area-ospf",
      explanation: {
        id: "ROUTING.PROTOCOL.SINGLE-AREA-OSPF",
        module: "routing",
        rule: "ROUTING.01",
        decision: "Selected Single-Area OSPF (Area 0) for Campus LAN",
        rationale: `Campus LAN operates within a single autonomous system with ${subnetCount} subnets (less than the ${maxSingleAreaSubnets}-subnet threshold). OSPF Area 0 provides fast link-state SPF convergence without multi-area ABR summarization complexity.`,
        inputs: { asNumber: input.asNumber, subnetCount, threshold: maxSingleAreaSubnets },
        references: ["RFC 2328 OSPFv2 Section 3.1", "Cisco Campus Network Design Guide"],
      },
    };
  }

  // Multi-site (Metro MAN) or >= 50 subnets within a single AS
  const reason =
    subnetCount >= maxSingleAreaSubnets
      ? `Subnet count (${subnetCount}) meets or exceeds the single-area scalability limit of ${maxSingleAreaSubnets} subnets`
      : `Multi-site topology (${input.sites.length} sites) requires routing-domain isolation`;

  return {
    protocol: "multi-area-ospf",
    explanation: {
      id: "ROUTING.PROTOCOL.MULTI-AREA-OSPF",
      module: "routing",
      rule: "ROUTING.02",
      decision: "Selected Multi-Area OSPF architecture with Area 0 backbone",
      rationale: `${reason}. Hierarchical area design isolates LSA flooding, reduces SPF recalculation frequency, and enforces area boundary summarization.`,
      inputs: { asNumber: input.asNumber, subnetCount, threshold: maxSingleAreaSubnets, sitesCount: input.sites.length },
      references: ["RFC 2328 OSPFv2 Section 3.2", "RFC 3509 Alternative OSPF ABR Implementations"],
    },
  };
}
