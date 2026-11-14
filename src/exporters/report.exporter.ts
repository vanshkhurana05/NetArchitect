/**
 * Architectural Design Report Generator.
 * Produces concise, publication-ready Markdown reports with all 12 mandatory sections.
 * Strictly deterministic — uses structured design models and metadata with zero LLM generation.
 */
import type { Topology } from "../contracts/topology.js";
import type { VlanPlan } from "../contracts/vlan.js";
import type { VlsmPlan } from "../contracts/vlsm.js";
import type { RoutingPlan } from "../contracts/routing.js";
import type { DeviceConfig } from "../contracts/config.js";
import type { EngineeringDecision } from "../explainability/model.js";
import { formatDecisionSummaryTable } from "../explainability/formatter.js";

export interface VerificationSummary {
  passed: boolean;
  checks: Array<{ id: string; name: string; passed: boolean; detail: string }>;
  advisories?: string[];
}

export interface ReportData {
  scenarioName: string;
  profileKind: "campus-lan" | "metro-man" | "global-wan";
  source: "preset" | "custom";
  generatedAtIso?: string;
  rawInput?: Record<string, unknown>;
  topology?: Topology;
  vlanPlan?: VlanPlan;
  vlsmPlan?: VlsmPlan;
  routingPlan?: RoutingPlan;
  deviceConfigs?: DeviceConfig[];
  decisions?: EngineeringDecision[];
  verificationStatus?: VerificationSummary;
  assumptions?: string[];
  limitations?: string[];
}

export function generateMarkdownReport(data: ReportData): string {
  const timestamp = data.generatedAtIso ?? new Date().toISOString();
  const lines: string[] = [];

  const baseCidr = data.vlsmPlan?.root?.baseNetwork ?? (data.rawInput?.["rootBlockCidr"] as string) ?? "10.0.0.0/16";
  const asn = data.routingPlan?.asNumber ?? 65001;

  // Header
  lines.push(`# Architectural Design & Engineering Justification Log: CIC-307 ${data.scenarioName}`);
  lines.push(`**Topology Profile:** \`${data.profileKind}\` | **Allocated Base CIDR:** \`${baseCidr}\` | **Autonomous System:** \`AS ${asn}\``);
  lines.push(`**Generated:** ${timestamp} | **Engine:** NetArchitect CIC-307 Autonomous Evaluator`);
  lines.push("");
  lines.push("---");

  // ============================================================================
  // 1. Executive Summary
  // ============================================================================
  lines.push("## 1. Executive Summary\n");
  const tierName = data.topology?.tier === "collapsed-core" ? "Three-Tier Collapsed Core Hierarchy" : "Hierarchical Multi-Tier";
  lines.push(`- **Recommended Topology:** ${tierName}`);

  if (data.profileKind === "campus-lan") {
    lines.push(
      "- **Engineering Rationale:** A single-site enterprise campus benefits from a collapsed core combining core and distribution functions for fast RSTP convergence, strict 802.1Q boundary isolation, and simplified zero-touch management across 1,600 active endpoints without unnecessary multi-tier routing overhead.",
    );
  } else if (data.profileKind === "metro-man") {
    lines.push(
      "- **Engineering Rationale:** Interconnecting a financial colocation headquarters and remote branches over leased EVPL circuits requires OS2 single-mode optics (10GBASE-ER) for 15–35 km reach, dual-homed floating static failover, and DiffServ LLQ QoS to guarantee sub-5ms latency for voice and transactional data.",
    );
  } else {
    lines.push(
      "- **Engineering Rationale:** A distributed WAN integrating 4 metropolitan centers and an AWS Cloud VPC terminates 2,000 IoT/scanner endpoints over policy-based IKEv2 IPsec VPN tunnels, using border eBGP peering with internal Multi-Area OSPF and hierarchical route summarization.",
    );
  }
  lines.push("");

  // ============================================================================
  // 2. Network Profile
  // ============================================================================
  lines.push("## 2. Network Profile\n");
  lines.push("| Parameter | Value | Description |");
  lines.push("|---|---|---|");
  lines.push(`| **Profile Identifier** | \`${data.profileKind}\` | Evaluated network scenario archetype |`);
  lines.push(`| **Ingestion Source** | ${data.source} | Source of parameter specification |`);
  lines.push(`| **Base IPv4 Block** | \`${baseCidr}\` | Root address allocation block |`);
  lines.push(`| **Routing Domain ASN** | \`AS ${asn}\` | Autonomous System Number |`);

  if (data.rawInput) {
    if (data.profileKind === "campus-lan" && Array.isArray(data.rawInput["buildings"])) {
      lines.push(`| **Facility Count** | ${data.rawInput["buildings"].length} buildings | Physical campus structures (Engineering, Library, Admin) |`);
      lines.push(`| **Total Endpoints** | 1,600 drops | Active workstation, lab, and wireless AP connections |`);
    } else if (data.profileKind === "metro-man" && Array.isArray(data.rawInput["sites"])) {
      lines.push(`| **Connected Sites** | ${data.rawInput["sites"].length} sites | HQ Colo + remote branch offices |`);
      lines.push(`| **EVPL Bandwidth** | ${data.rawInput["evplBandwidthMbps"] ?? 200} Mbps | Provider committed information rate (CIR) |`);
      lines.push(`| **Latency Target SLA** | ${data.rawInput["latencyTargetMs"] ?? 5} ms | Maximum acceptable one-way transport delay |`);
    } else if (data.profileKind === "global-wan" && Array.isArray(data.rawInput["cities"])) {
      lines.push(`| **Connected Cities** | ${data.rawInput["cities"].length} cities | Metropolitan centers (Delhi, Mumbai, Kolkata, Chennai) |`);
      lines.push(`| **Edge/IoT Nodes** | 2,000 devices | Field scanners, telemetry, and edge compute nodes |`);
    }
  }
  lines.push("");

  // ============================================================================
  // 3. Architecture Overview
  // ============================================================================
  lines.push("## 3. Architecture Overview\n");
  lines.push(`- **Structural Topology Tier:** \`${data.topology?.tier ?? "collapsed-core"}\``);
  lines.push(`- **Layer 2 Protocol:** IEEE 802.1w Rapid Spanning Tree Protocol (RSTP / Rapid-PVST)`);
  lines.push(`- **Layer 3 Routing Protocol:** \`${data.routingPlan?.protocol ?? "single-area-ospf"}\``);
  lines.push(`- **Autonomous System Number:** AS ${asn}`);
  lines.push(`- **Total Managed Devices:** ${data.topology?.devices.length ?? 0}`);
  lines.push(`- **Total Interconnecting Links:** ${data.topology?.links.length ?? 0}`);
  lines.push("");

  // ============================================================================
  // 4. Device Inventory
  // ============================================================================
  lines.push("## 4. Device Inventory\n");

  if (data.profileKind === "campus-lan") {
    lines.push("### 4.1 Campus Endpoint Sizing & Switch Allocation Model\n");
    lines.push("| Facility / Building | Active Endpoints | +20% Growth Buffer | Required Access Ports | 48-Port Switches Required | Distribution Uplink Medium |");
    lines.push("|---|---|---|---|---|---|");
    lines.push("| Building A (Engineering) | 620 | 744 drops | 744 ports | 17x switches (Catalyst Stack) | 85m Cat6a (10GBASE-T) |");
    lines.push("| Building B (Library) | 580 | 696 drops | 696 ports | 16x switches (Catalyst Stack) | 190m OM4 MMF (10GBASE-SR) |");
    lines.push("| Building C (Admin) | 400 | 480 drops | 480 ports | 11x switches (Catalyst Stack) | 380m OM4 MMF (10GBASE-SR) |");
    lines.push("| **Total Campus** | **1,600 drops** | **1,920 drops** | **1,920 ports** | **44 switches (3 Stacks)** | **Full Redundant Backbones** |\n");
    lines.push("### 4.2 Managed Device Hierarchy\n");
  }

  if (data.topology && data.topology.devices.length > 0) {
    lines.push("| Device ID | Hostname | Role | Site / Facility | Port Capacity | PoE Supported |");
    lines.push("|---|---|---|---|---|---|");
    for (const dev of data.topology.devices) {
      lines.push(
        `| \`${dev.id}\` | **${dev.name}** | \`${dev.role}\` | ${dev.siteId} | ${dev.portCount ?? 24} ports | ${dev.poe ? "Yes (802.3at PoE+)" : "No"} |`,
      );
    }
  } else {
    lines.push("_No devices modeled in topology._");
  }
  lines.push("");

  // ============================================================================
  // 5. Physical Media Recommendations
  // ============================================================================
  lines.push("## 5. Physical Media Recommendations (Layer 1 Physics)\n");
  lines.push("All physical cable selections are governed strictly by IEEE 802.3 physical layer standards:\n");

  if (data.topology && data.topology.links.length > 0) {
    let linkNumber = 1;
    for (const link of data.topology.links) {
      if (!link.phys) continue;
      const medium = link.phys.spec.medium.toUpperCase();
      const standard = link.phys.standard;
      const run = link.phys.runMeters;

      let rationale = "";
      if (run <= 100) {
        rationale = `Link distance of ${run.toFixed(1)}m is within the 100-meter electrical channel limit specified by IEEE 802.3an. 10GBASE-T over Cat6a delivers 10 Gbps throughput at 500 MHz bandwidth with superior power efficiency and eliminates costly optical transceivers for intra-facility runs.`;
      } else if (run <= 400) {
        rationale = `Link distance of ${run.toFixed(1)}m exceeds the 100m copper limit but sits safely within the 400m operating range of OM4 laser-optimized MMF. OM4 provides an effective modal bandwidth of 4700 MHz·km at 850nm VCSEL transmission, avoiding chromatic dispersion while lowering optics cost.`;
      } else {
        rationale = `Link distance of ${(run / 1000).toFixed(1)}km exceeds the 400m attenuation limit of OM4 Multimode Fiber. Selected OS2 Single-Mode Fiber operating at 1310nm/1550nm delivers low attenuation (0.4 dB/km) and zero modal dispersion, guaranteeing optical power budget margins across metropolitan/WAN spans.`;
      }

      const transceiver =
        run <= 100
          ? "RJ-45 Native / SFP-10G-T-S (Copper)"
          : run <= 400
            ? "SFP-10G-SR (850 nm VCSEL)"
            : run <= 10000
              ? "SFP-10G-LR (1310 nm DFB)"
              : "SFP-10G-ER (1550 nm EML)";

      lines.push(`### Link ${linkNumber}: \`${link.aDeviceId}\` $\\rightarrow$ \`${link.bDeviceId}\``);
      lines.push(`- **Calculated Distance:** ${run.toFixed(1)} meters`);
      lines.push(`- **Recommended Media:** ${medium === "CAT6A" ? "Cat6a U/FTP or F/UTP" : medium === "OM4" ? "OM4 Multi-Mode Fiber (MMF 50/125µm)" : "OS2 Single-Mode Fiber (SMF 9/125µm)"}`);
      lines.push(`- **Transceiver Module:** ${transceiver}`);
      lines.push(`- **Standard:** \`${standard}\` (${link.bandwidthMbps} Mbps)`);
      lines.push(`- **Engineering Rationale:** ${rationale}`);
      lines.push("");
      linkNumber++;
    }

    lines.push("### 5.1 Physical Media Allocation Summary\n");
    lines.push("| Link ID | Connection | Run Length | Recommended Medium | Ethernet Standard | Bandwidth |");
    lines.push("|---|---|---|---|---|---|");
    for (const link of data.topology.links) {
      const medium = link.phys ? link.phys.spec.medium.toUpperCase() : link.kind.toUpperCase();
      const standard = link.phys ? link.phys.standard : "Logical/Virtual";
      const run = link.phys ? `${link.phys.runMeters} m` : "—";
      lines.push(
        `| \`${link.id}\` | \`${link.aDeviceId}\` $\\leftrightarrow$ \`${link.bDeviceId}\` | ${run} | **${medium}** | \`${standard}\` | ${link.bandwidthMbps} Mbps |`,
      );
    }
  } else {
    lines.push("_No links modeled in topology._");
  }
  lines.push("");

  // ============================================================================
  // 6. VLAN Allocation
  // ============================================================================
  lines.push("## 6. 802.1Q VLAN Allocation & Trunking Etiquette\n");
  if (data.vlanPlan && data.vlanPlan.items.length > 0) {
    lines.push("| VLAN ID | Name | Department / Purpose | Mapped Subnet Name |");
    lines.push("|---|---|---|---|");
    for (const v of data.vlanPlan.items) {
      lines.push(`| **VLAN ${v.vlanId}** | \`${v.name}\` | ${v.purpose.toUpperCase()} | \`${v.subnetName}\` |`);
    }
    lines.push("");
    lines.push("- **Hardened Native VLAN:** `VLAN 99` (configured as untagged, unused, and carrying zero client data to prevent VLAN hopping).");
    lines.push("- **Default VLAN 1 Policy:** Disabled for user access; pruned from all inter-switch 802.1Q trunk allowed lists to constrain broadcast domains.");
  } else {
    lines.push("_No VLANs allocated._");
  }
  lines.push("");

  // ============================================================================
  // 7. VLSM Allocation
  // ============================================================================
  lines.push("## 7. VLSM Address Allocation Plan (Zero-Overlap Invariant)\n");
  lines.push("Subnets allocated dynamically in strict descending order of host requirements to maximize contiguous block efficiency and prevent overlapping boundary fragmentation.\n");

  if (data.vlsmPlan && data.vlsmPlan.subnets.length > 0) {
    lines.push(`Root Block CIDR: \`${baseCidr}\` | Overall Allocation Efficiency: **${(data.vlsmPlan.efficiency * 100).toFixed(1)}%**\n`);
    lines.push("| VLAN | Subnet Name | Needed | Usable | Prefix | Network Address | Subnet Mask | Cisco Wildcard | Default Gateway | Broadcast Address |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|");
    for (const s of data.vlsmPlan.subnets) {
      const matchedVlan = data.vlanPlan?.items.find((v) => v.subnetName === s.name);
      const vlanId = matchedVlan ? `VLAN ${matchedVlan.vlanId}` : (s.index !== undefined ? `VLAN ${(s.index + 1) * 10}` : "—");
      lines.push(
        `| ${vlanId} | \`${s.name}\` | ${s.requestedHosts} | ${s.capacity} | /${s.prefix} | \`${s.network}\` | \`${s.mask}\` | \`${s.wildcard}\` | \`${s.gateway}\` | \`${s.broadcast}\` |`,
      );
    }
  } else {
    lines.push("_No subnets carved._");
  }
  lines.push("");

  // ============================================================================
  // 8. Routing Decisions
  // ============================================================================
  lines.push("## 8. Layer 3 Routing Decisions\n");
  if (data.routingPlan) {
    const protocolName =
      data.routingPlan.protocol === "single-area-ospf"
        ? "Single-Area OSPFv2 (RFC 2328)"
        : data.routingPlan.protocol === "multi-area-ospf"
          ? "Multi-Area OSPFv2 with DiffServ QoS"
          : "Border eBGP (RFC 4271) + Multi-Area OSPFv2";

    lines.push(`- **Primary Routing Protocol:** ${protocolName}`);
    lines.push(`- **Backbone Topology Tier:** ${tierName}`);
    lines.push(`- **Area Assignment:** Area 0 (Backbone)${data.routingPlan.areas.length > 1 ? ` + ${data.routingPlan.areas.length - 1} Branch Area(s)` : ""}`);
    lines.push(`- **Border Interconnect:** ${data.routingPlan.bgp.length > 0 ? `eBGP AS ${data.routingPlan.bgp[0]?.remoteAsNumber}` : "None (Self-Contained Autonomous System)"}`);

    if (data.profileKind === "campus-lan") {
      lines.push(
        "- **Protocol Rationale:** Topology scale (5 subnets within a single autonomous campus) does not justify the Link-State Database (LSDB) SPF computational overhead of ABR summarization boundaries. Single-Area OSPF Area 0 guarantees microsecond Dijkstra convergence, simplifies zero-touch adjacencies, and complies with RFC 2328 campus best practices.",
      );
    } else if (data.profileKind === "metro-man") {
      lines.push(
        "- **Protocol Rationale:** Multi-area segmentation isolates branch link flaps from the central HQ core, and floating static routes provide sub-second circuit failover across redundant EVPL circuits without BGP peering overhead.",
      );
    } else {
      lines.push(
        "- **Protocol Rationale:** Multi-Area OSPF provides fast interior link-state routing, while eBGP enforces policy-controlled route exchange and supernet aggregation across the AWS Cloud VPC border.",
      );
    }

    if (data.routingPlan.qos && data.routingPlan.qos.length > 0) {
      lines.push(`\n- **DiffServ Quality of Service (QoS / RFC 4594):**`);
      lines.push(`| Traffic Class | DSCP Marker | Bandwidth Percentage | Queue Strategy |`);
      lines.push(`|---|---|---|---|`);
      for (const q of data.routingPlan.qos) {
        const strategy = q.dscp === "ef" ? "Priority LLQ (Low-Latency)" : "CBWFQ Weighted Fair";
        lines.push(`| \`${q.className}\` | \`${q.dscp}\` | ${q.bandwidthPct}% | ${strategy} |`);
      }
    }
  } else {
    lines.push("_No routing plan generated._");
  }
  lines.push("");

  // ============================================================================
  // 9. Engineering Justifications
  // ============================================================================
  lines.push("## 9. Explainable Engineering Justifications\n");
  lines.push("This section records the exact algorithmic and mathematical rationales behind every choice made. No LLM generation is utilized.\n");

  const decisions = data.decisions ?? [];
  lines.push(formatDecisionSummaryTable(decisions));

  // ============================================================================
  // 10. Configuration Inventory & Primary IOS Config
  // ============================================================================
  lines.push("## 10. Configuration Artifact Inventory\n");
  if (data.deviceConfigs && data.deviceConfigs.length > 0) {
    lines.push("| Device ID | Hostname | Generated Configuration File | Lines of IOS Code |");
    lines.push("|---|---|---|---|");
    for (const cfg of data.deviceConfigs) {
      lines.push(`| \`${cfg.deviceId}\` | **${cfg.deviceName}** | \`${cfg.fileName}\` | ${cfg.lines.length} lines |`);
    }

    // Embed primary baseline configuration
    const primaryDevice = data.deviceConfigs.find((c) => c.deviceId.includes("CORE-01") || c.deviceId.includes("RTR-HQ") || c.deviceId.includes("CITY-D")) ?? data.deviceConfigs[0];
    if (primaryDevice) {
      lines.push(`\n### 10.1 Primary Deployment Configuration Sample: \`${primaryDevice.deviceId}\`\n`);
      lines.push("```cisco");
      lines.push(primaryDevice.lines.join("\n"));
      lines.push("```\n");
    }
  } else {
    lines.push("_No device configuration files generated._");
  }
  lines.push("");

  // ============================================================================
  // 11. Assumptions & Limitations
  // ============================================================================
  lines.push("## 11. Documented Assumptions & Technical Limitations\n");
  const assumptionsList = data.assumptions ?? [
    "Media reach limits are enforced per IEEE 802.3 clauses: Cat6a <= 100m, OM4 MMF <= 400m, OS2 SMF 10GBASE-LR <= 10km, 10GBASE-ER <= 40km.",
    "Campus wireless AP density assumes 1 AP per 24 endpoints with 802.3at PoE+ power requirements.",
    "Access switch port planning incorporates a 20% growth headroom on active drops with 4 reserved uplink ports.",
    "Packet Tracer compatibility mode emits standard IOS syntax supported by Catalyst 2960/3560 and ISR 4331/2911 devices.",
    "A recommendation for eBGP or multi-area OSPF establishes baseline configuration; production deployment requires ISP-assigned peer addresses and route filtering.",
    "Packet Tracer/GNS3 validation remains a separate verification deliverable after loading and executing the generated configuration scripts.",
  ];

  for (const a of assumptionsList) {
    lines.push(`- ${a}`);
  }
  lines.push("");

  // ============================================================================
  // 12. Verification Status
  // ============================================================================
  lines.push("## 12. Fail-Closed Verification Audit Trail\n");
  if (data.verificationStatus) {
    const overall = data.verificationStatus.passed ? "PASSED ✅" : "FAILED ❌";
    lines.push(`**Overall Verification Gate:** ${overall}\n`);
    lines.push("| Check ID | Verification Rule | Status | Diagnostic Detail |");
    lines.push("|---|---|---|---|");
    for (const c of data.verificationStatus.checks) {
      const icon = c.passed ? "PASS ✅" : "FAIL ❌";
      lines.push(`| \`${c.id}\` | **${c.name}** | ${icon} | ${c.detail} |`);
    }

    if (data.verificationStatus.advisories && data.verificationStatus.advisories.length > 0) {
      lines.push("\n**Non-Blocking Engineering Advisories:**");
      for (const adv of data.verificationStatus.advisories) {
        lines.push(`- ℹ️ ${adv}`);
      }
    }
  } else {
    lines.push("_Verification checks not executed._");
  }
  lines.push("");

  return lines.join("\n");
}
