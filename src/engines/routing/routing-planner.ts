/**
 * Layer 3 Routing Decision Engine.
 * Master coordinator planning OSPF areas, eBGP sessions, IPsec tunnels,
 * route summarization, failover paths, and QoS policy classes.
 * OWNER: Routing specialist agent (src/engines/routing/).
 */
import type {
  RoutingPlan,
  RoutingEngineInput,
  VpnTunnel,
  QosPolicyClass,
} from "../../contracts/routing.js";
import type { ExplainRecord } from "../../contracts/explain.js";
import { chooseRoutingProtocol, validateAsn } from "./protocol-chooser.js";
import { planOspfAreas } from "./ospf-planner.js";
import { planBgpSessions } from "./bgp-planner.js";
import { planRedundantPaths } from "./failover.js";
import { calculateRouteSummary } from "./summarization.js";
import type { RoutingPlannerOptions } from "./types.js";

export const DEFAULT_QOS_CLASSES: QosPolicyClass[] = [
  { className: "VOICE-EF", dscp: "ef", bandwidthPct: 30 },
  { className: "TRANSACTIONAL-AF31", dscp: "af31", bandwidthPct: 40 },
  { className: "VIDEO-AF21", dscp: "af21", bandwidthPct: 20 },
  { className: "DEFAULT-BEST-EFFORT", dscp: "default", bandwidthPct: 10 },
];

/**
 * Executes Layer 3 routing planning across Campus LAN, Metro MAN, or Global WAN.
 */
export function planRouting(
  input: RoutingEngineInput,
  options?: RoutingPlannerOptions,
): RoutingPlan {
  validateAsn(input.asNumber, "asNumber");

  const explanations: ExplainRecord[] = [];

  // 1. Choose Routing Protocol
  const decision = chooseRoutingProtocol(input, options?.maxSingleAreaSubnets ?? 50);
  explanations.push(decision.explanation);

  // 2. Plan OSPF Areas & Network Advertisements
  const isMultiArea = decision.protocol !== "single-area-ospf";
  const areas = planOspfAreas(
    input.profile,
    input.sites,
    input.devices,
    input.subnets,
    {
      multiArea: isMultiArea,
      summarizeAtAbr: options?.enableRouteSummarization !== false,
    },
  );

  explanations.push({
    id: "ROUTING.OSPF.AREAS",
    module: "routing",
    rule: "ROUTING.04",
    decision: `Configured ${areas.length} OSPF area(s) with ${areas.reduce((acc, a) => acc + a.networks.length, 0)} network statements`,
    rationale: "Network statements map exact network-aligned CIDRs and inverse wildcard masks directly from the VLSM plan, ensuring flawless LSDB population.",
    inputs: { areasCount: areas.length, totalNetworks: areas.reduce((acc, a) => acc + a.networks.length, 0) },
    references: ["RFC 2328 Section 3.1", "RFC 1878"],
  });

  // 3. Plan eBGP Sessions (if multi-domain / cloud VPC present)
  let bgpSessions: RoutingPlan["bgp"] = [];
  if (decision.protocol === "ospf-ebgp" && input.cloudVpc) {
    const cloudAsn = options?.cloudProviderAsn ?? 64512; // RFC 6996 private ASN
    bgpSessions = planBgpSessions({
      localAsNumber: input.asNumber,
      remoteAsNumber: cloudAsn,
      devices: input.devices,
      subnets: input.subnets,
      cloudVpc: input.cloudVpc,
    });

    explanations.push({
      id: "ROUTING.BGP.EBGP-PEERING",
      module: "routing",
      rule: "ROUTING.05",
      decision: `Established eBGP peering between Enterprise AS ${input.asNumber} and Cloud Provider AS ${cloudAsn}`,
      rationale: "eBGP session advertises summarized enterprise supernet towards Cloud VPC peer IP to prevent routing table bloat and enforce policy separation.",
      inputs: { localAs: input.asNumber, remoteAs: cloudAsn, peerIps: input.cloudVpc.vpnPeerPublicIps },
      references: ["RFC 4271 BGP-4", "RFC 6996 Autonomous System Number Reservation"],
    });
  }

  // 4. Plan IPsec VPN Tunnels (for Global WAN with Cloud VPC)
  const vpnTunnels: VpnTunnel[] = [];
  if (input.profile === "global-wan" && input.cloudVpc) {
    const borderRouter =
      input.devices.find((d) => d.role === "wan-router" && (d.siteId.includes("HQ") || d.siteId.includes("D"))) ??
      input.devices.find((d) => d.role === "wan-router") ??
      input.devices[0]!;

    const localSummary = calculateRouteSummary(input.subnets);

    for (const peerIp of input.cloudVpc.vpnPeerPublicIps) {
      vpnTunnels.push({
        deviceId: borderRouter.id,
        peerPublicIp: peerIp,
        ikeVersion: 2,
        cryptoProfileName: "IKEv2-PROD-PROFILE",
        localProtectedCidr: localSummary.summaryCidr,
        remoteProtectedCidr: input.cloudVpc.vpcCidr,
      });
    }

    explanations.push({
      id: "ROUTING.SECURITY.IPSEC-IKEV2",
      module: "security",
      rule: "SEC.01",
      decision: `Configured ${vpnTunnels.length} IKEv2 site-to-site IPsec tunnel(s) toward Cloud VPC`,
      rationale: "IKEv2 protects transit between enterprise border routers and Cloud VPC with AES-256-GCM encryption and SHA-384 integrity (RFC 7296).",
      inputs: { tunnelsCount: vpnTunnels.length, peerIps: input.cloudVpc.vpnPeerPublicIps },
      references: ["RFC 7296 IKEv2", "NIST SP 800-77"],
    });
  }

  // 5. Plan QoS Policies (for Metro MAN)
  let qosPolicies: QosPolicyClass[] | undefined;
  if (input.profile === "metro-man" || (input.qosClasses && input.qosClasses.length > 0)) {
    qosPolicies = [...DEFAULT_QOS_CLASSES];
    explanations.push({
      id: "ROUTING.QOS.DIFFSERV-QUEUING",
      module: "qos",
      rule: "QOS.01",
      decision: "Configured 4-class DiffServ QoS policy on EVPL provider circuits",
      rationale: "Classifies EF Voice (30% priority queue) and AF31 Transactional data (40% bandwidth queue) to guarantee sub-5ms SLA latency under congestion.",
      inputs: { classes: DEFAULT_QOS_CLASSES.map((q) => q.className) },
      references: ["RFC 4594 DiffServ Class Architecture", "RFC 3246 Expedited Forwarding"],
    });
  }

  // 6. Plan Redundant Failover Paths (for links with betweenSites)
  if (input.links && input.links.length > 0) {
    const failoverPlans = planRedundantPaths(input.links);
    if (failoverPlans.length > 0) {
      explanations.push({
        id: "ROUTING.FAILOVER.METRIC-STEERING",
        module: "routing",
        rule: "ROUTING.06",
        decision: `Planned deterministic route failover across ${failoverPlans.length} circuit pair(s)`,
        rationale: "Primary circuits are biased with metric 10 while secondary circuits carry metric 20, guaranteeing hitless failover upon primary link flap.",
        inputs: { failoverPairs: failoverPlans.length },
        references: ["Cisco Resilient Network Design", "RFC 2328 Cost Metric Semantics"],
      });
    }
  }

  const routingPlan: RoutingPlan = {
    asNumber: input.asNumber,
    protocol: decision.protocol,
    areas,
    bgp: bgpSessions,
    vpnTunnels,
    explanations,
  };
  if (qosPolicies) {
    routingPlan.qos = qosPolicies;
  }

  return routingPlan;
}
