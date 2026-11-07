# NetArchitect Design Report — GLOBAL Design Report
**Generated:** 2026-11-07T23:47:28.284Z | **Profile:** `global-wan` | **Source:** PRESET

---
## 1. Executive Summary

This document presents the architectural blueprint and copy-paste-ready Cisco configurations for a **Global WAN** deployment connecting 4 distributed metropolitan centers and an Amazon Web Services (AWS) Cloud VPC. The design terminates 2,000 distributed IoT and scanner devices via site-to-site IKEv2 IPsec VPN tunnels, establishing policy-based eBGP peering at the autonomous system boundary with internal Multi-Area OSPF and hierarchical route summarization.

## 2. Network Profile

| Parameter | Value | Description |
|---|---|---|
| **Profile Identifier** | `global-wan` | Evaluated network scenario archetype |
| **Ingestion Source** | preset | Source of parameter specification |
| **Connected Cities** | 4 cities | Metropolitan centers |
| **Edge/IoT Nodes** | 2,000 devices | Field scanners, telemetry, and edge compute nodes |

## 3. Architecture Overview

- **Structural Topology Tier:** `three-tier`
- **Layer 2 Protocol:** IEEE 802.1w Rapid Spanning Tree Protocol (RSTP / Rapid-PVST)
- **Layer 3 Routing Protocol:** `ospf-ebgp`
- **Autonomous System Number:** AS 65001
- **Total Managed Devices:** 5
- **Total Interconnecting Links:** 5

## 4. Device Inventory

| Device ID | Hostname | Role | Site / Facility | Port Capacity | PoE Supported |
|---|---|---|---|---|---|
| `RTR-CITY-D` | **WAN Router Delhi HQ (Logistics Control)** | `wan-router` | CITY-D | 16 ports | No |
| `RTR-CITY-M` | **WAN Router Mumbai Distribution** | `wan-router` | CITY-M | 16 ports | No |
| `RTR-CITY-K` | **WAN Router Kolkata Scanners** | `wan-router` | CITY-K | 16 ports | No |
| `RTR-CITY-C` | **WAN Router Chennai Scanners** | `wan-router` | CITY-C | 16 ports | No |
| `GW-CLOUD-VPC` | **Cloud VPN Gateway (AWS VGW)** | `cloud-vpn-gateway` | SITE-CLOUD-VPC | 8 ports | No |

## 5. Physical Media Recommendations (Layer 1 Physics)

All physical cable selections are governed strictly by IEEE 802.3 physical layer standards:

| Link ID | Connection | Run Length | Recommended Medium | Ethernet Standard | Bandwidth |
|---|---|---|---|---|---|
| `LINK-WAN-CITY-D-CITY-M` | `RTR-CITY-D` $\leftrightarrow$ `RTR-CITY-M` | — | **IPSEC-TUNNEL** | `Logical/Virtual` | 100 Mbps |
| `LINK-WAN-CITY-D-CITY-K` | `RTR-CITY-D` $\leftrightarrow$ `RTR-CITY-K` | — | **IPSEC-TUNNEL** | `Logical/Virtual` | 100 Mbps |
| `LINK-WAN-CITY-D-CITY-C` | `RTR-CITY-D` $\leftrightarrow$ `RTR-CITY-C` | — | **IPSEC-TUNNEL** | `Logical/Virtual` | 100 Mbps |
| `LINK-IPSEC-HQ-CLOUD` | `RTR-CITY-D` $\leftrightarrow$ `GW-CLOUD-VPC` | — | **IPSEC-TUNNEL** | `Logical/Virtual` | 1000 Mbps |
| `LINK-BGP-HQ-CLOUD` | `RTR-CITY-D` $\leftrightarrow$ `GW-CLOUD-VPC` | — | **BGP-SESSION** | `Logical/Virtual` | 1000 Mbps |

## 6. 802.1Q VLAN Allocation & Trunking Etiquette

| VLAN ID | Name | Department / Purpose | Mapped Subnet Name |
|---|---|---|---|
| **VLAN 10** | `MGMT` | MANAGEMENT | `MGMT-NET` |
| **VLAN 20** | `IOT-NODES` | IOT | `IOT-NODES-NET` |
| **VLAN 30** | `SCANNERS` | WIRELESS | `SCANNERS-NET` |
| **VLAN 40** | `ANALYTICS` | SERVERS | `ANALYTICS-NET` |

- **Hardened Native VLAN:** `VLAN 99` (configured as untagged, unused, and carrying zero client data).
- **Default VLAN 1 Policy:** Disabled for user access; pruned from all inter-switch 802.1Q trunk allowed lists.

## 7. VLSM Address Allocation Plan (Zero-Overlap Invariant)

Root Block CIDR: `10.40.0.0` | Overall Allocation Efficiency: **3.8%**

| Subnet Name | Network Address | Prefix | Subnet Mask | Wildcard Mask | Gateway IP | Usable Host Range | Hosts (Req/Cap) |
|---|---|---|---|---|---|---|---|
| `IOT-NODES-NET` | `10.40.0.0` | /21 | `255.255.248.0` | `0.0.7.255` | `10.40.0.1` | `10.40.0.1` – `10.40.7.254` | 1800 / 2046 |
| `SCANNERS-NET` | `10.40.8.0` | /24 | `255.255.255.0` | `0.0.0.255` | `10.40.8.1` | `10.40.8.1` – `10.40.8.254` | 200 / 254 |
| `ANALYTICS-NET` | `10.40.9.0` | /25 | `255.255.255.128` | `0.0.0.127` | `10.40.9.1` | `10.40.9.1` – `10.40.9.126` | 100 / 126 |
| `MGMT-NET` | `10.40.9.128` | /27 | `255.255.255.224` | `0.0.0.31` | `10.40.9.129` | `10.40.9.129` – `10.40.9.158` | 30 / 30 |

## 8. Layer 3 Routing Decisions

- **Selected Routing Protocol:** `ospf-ebgp`
- **Autonomous System (ASN):** `AS 65001`
- **OSPF Areas Planned:** 1 area(s)
  - **Area 0 (Backbone Area 0 (Delhi HQ (Logistics Control))):** 4 network statements, sites: [CITY-D]

- **External BGP (eBGP) Sessions:**
  - Border Router `RTR-CITY-D` $\rightarrow$ Peer IP `203.0.113.10` (Remote AS 64512)
    - Advertised Supernets: `10.40.0.0/20`

- **IPsec IKEv2 Site-to-Site VPN Tunnels:**
  - Device `RTR-CITY-D` $\rightarrow$ Remote Peer `203.0.113.10` (Protected: `10.40.0.0/20` $\leftrightarrow$ `172.20.0.0/16`)
  - Device `RTR-CITY-D` $\rightarrow$ Remote Peer `203.0.113.11` (Protected: `10.40.0.0/20` $\leftrightarrow$ `172.20.0.0/16`)

## 9. Explainable Engineering Justifications

This section records the exact algorithmic and mathematical rationales behind every choice made. No LLM generation is utilized.

| Decision ID | Module | Rule ID | Selected Recommendation | Technical Rationale | References |
|---|---|---|---|---|---|
| `TOPO.GLOBAL-WAN-MESH` | TOPOLOGY | `TOPO.04` | **Constructed hub-and-spoke WAN with IPsec tunnels and Cloud VPC gateway** | Hub-and-spoke topology with IPsec VPN connectivity enables cost-effective WAN integration of 2,000 distributed IoT nodes with secure VPC aggregation. | RFC 4301 IPsec Architecture, RFC 4271 BGP-4 |
| `VLAN.DETERMINISTIC-TAGS` | VLAN | `VLAN.01` | **Assigned deterministic 802.1Q tags starting at 10 (+10)** | Standardized VLAN numbering ensures uniform broadcast domain mapping across campus switches and prevents conflicting PVIDs. | IEEE 802.1Q, Cisco Campus LAN Best Practices |
| `VLAN.NATIVE-HARDENING` | VLAN | `VLAN.02` | **Configured Native VLAN 99 as untagged and unused on all trunks** | Setting the native VLAN to an unused ID (VLAN 99) and disallowing default VLAN 1 mitigates 802.1Q double-tagging and VLAN hopping security vulnerabilities. | NIST SP 800-115, DISA Network Infrastructure STIG |
| `VLAN.TRUNK-PRUNING` | VLAN | `VLAN.03` | **Restricted trunk links to explicitly allowed VLAN list [10,20,30,40]** | Explicit allowed-VLAN pruning confines broadcast/multicast traffic strictly to authorized switches, conserving backplane bandwidth. | IEEE 802.1Q Clause 9, RFC 3069 |
| `VLSM.ALLOC-0-IOT-NODES-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated IOT-NODES-NET as 10.40.0.0/21** | 1800 requested hosts map to the minimal /21 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.40.0.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-1-SCANNERS-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated SCANNERS-NET as 10.40.8.0/24** | 200 requested hosts map to the minimal /24 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.40.8.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-2-ANALYTICS-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated ANALYTICS-NET as 10.40.9.0/25** | 100 requested hosts map to the minimal /25 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.40.9.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-3-MGMT-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated MGMT-NET as 10.40.9.128/27** | 30 requested hosts map to the minimal /27 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.40.9.129 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.UTILIZATION` | VLSM | `VLSM.CAPACITY` | **Root-block utilization 3.75%** | (2456 usable addresses of 65534 in 10.40.0.0/16, 4 blocks carved, 63072 address(es) left free. | RFC 950 |
| `VLSM.NO-OVERLAP` | VLSM | `VLSM.INVARIANT` | **No-overlap invariant holds across all allocations.** | Monotone carving guarantees non-intersection; verified with an O(n) boundary assertion. | RFC 950 |
| `ROUTING.PROTOCOL.OSPF-EBGP` | ROUTING | `ROUTING.03` | **Selected OSPF + eBGP multi-domain routing architecture** | Enterprise Autonomous System AS 65001 connects to external Cloud VPC boundary. eBGP handles policy-based inter-AS exchange (RFC 4271), while multi-area OSPF isolates internal enterprise areas. | RFC 4271 BGP-4, RFC 4364 BGP/MPLS IP VPNs, RFC 2328 OSPFv2 |
| `ROUTING.OSPF.AREAS` | ROUTING | `ROUTING.04` | **Configured 1 OSPF area(s) with 4 network statements** | Network statements map exact network-aligned CIDRs and inverse wildcard masks directly from the VLSM plan, ensuring flawless LSDB population. | RFC 2328 Section 3.1, RFC 1878 |
| `ROUTING.BGP.EBGP-PEERING` | ROUTING | `ROUTING.05` | **Established eBGP peering between Enterprise AS 65001 and Cloud Provider AS 64512** | eBGP session advertises summarized enterprise supernet towards Cloud VPC peer IP to prevent routing table bloat and enforce policy separation. | RFC 4271 BGP-4, RFC 6996 Autonomous System Number Reservation |
| `ROUTING.SECURITY.IPSEC-IKEV2` | SECURITY | `SEC.01` | **Configured 2 IKEv2 site-to-site IPsec tunnel(s) toward Cloud VPC** | IKEv2 protects transit between enterprise border routers and Cloud VPC with AES-256-GCM encryption and SHA-384 integrity (RFC 7296). | RFC 7296 IKEv2, NIST SP 800-77 |
| `ROUTING.FAILOVER.METRIC-STEERING` | ROUTING | `ROUTING.06` | **Planned deterministic route failover across 1 circuit pair(s)** | Primary circuits are biased with metric 10 while secondary circuits carry metric 20, guaranteeing hitless failover upon primary link flap. | Cisco Resilient Network Design, RFC 2328 Cost Metric Semantics |

#### Domain: TOPOLOGY

##### [TOPO.04] Constructed hub-and-spoke WAN with IPsec tunnels and Cloud VPC gateway
- **Decision ID:** `TOPO.GLOBAL-WAN-MESH`
- **Governing Rule:** `TOPO.04`
- **Technical Rationale:**
  - Hub-and-spoke topology with IPsec VPN connectivity enables cost-effective WAN integration of 2,000 distributed IoT nodes with secure VPC aggregation.
- **Governing Inputs:** `{"citiesCount":4,"cloudProvider":"aws"}`
- **Normative References:** RFC 4301 IPsec Architecture, RFC 4271 BGP-4

#### Domain: VLAN

##### [VLAN.01] Assigned deterministic 802.1Q tags starting at 10 (+10)
- **Decision ID:** `VLAN.DETERMINISTIC-TAGS`
- **Governing Rule:** `VLAN.01`
- **Technical Rationale:**
  - Standardized VLAN numbering ensures uniform broadcast domain mapping across campus switches and prevents conflicting PVIDs.
- **Governing Inputs:** `{"totalVlans":4,"startId":10,"increment":10}`
- **Normative References:** IEEE 802.1Q, Cisco Campus LAN Best Practices

##### [VLAN.02] Configured Native VLAN 99 as untagged and unused on all trunks
- **Decision ID:** `VLAN.NATIVE-HARDENING`
- **Governing Rule:** `VLAN.02`
- **Technical Rationale:**
  - Setting the native VLAN to an unused ID (VLAN 99) and disallowing default VLAN 1 mitigates 802.1Q double-tagging and VLAN hopping security vulnerabilities.
- **Governing Inputs:** `{"nativeVlanId":99,"defaultVlanDisabled":1}`
- **Normative References:** NIST SP 800-115, DISA Network Infrastructure STIG

##### [VLAN.03] Restricted trunk links to explicitly allowed VLAN list [10,20,30,40]
- **Decision ID:** `VLAN.TRUNK-PRUNING`
- **Governing Rule:** `VLAN.03`
- **Technical Rationale:**
  - Explicit allowed-VLAN pruning confines broadcast/multicast traffic strictly to authorized switches, conserving backplane bandwidth.
- **Governing Inputs:** `{"allowedVlanIds":[10,20,30,40]}`
- **Normative References:** IEEE 802.1Q Clause 9, RFC 3069

#### Domain: VLSM

##### [VLSM.DESCENDING-CARVE] Allocated IOT-NODES-NET as 10.40.0.0/21
- **Decision ID:** `VLSM.ALLOC-0-IOT-NODES-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 1800 requested hosts map to the minimal /21 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.40.0.1 (first usable IP).
- **Governing Inputs:** `{"hosts":1800,"inputIndex":1,"prefix":21}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.DESCENDING-CARVE] Allocated SCANNERS-NET as 10.40.8.0/24
- **Decision ID:** `VLSM.ALLOC-1-SCANNERS-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 200 requested hosts map to the minimal /24 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.40.8.1 (first usable IP).
- **Governing Inputs:** `{"hosts":200,"inputIndex":2,"prefix":24}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.DESCENDING-CARVE] Allocated ANALYTICS-NET as 10.40.9.0/25
- **Decision ID:** `VLSM.ALLOC-2-ANALYTICS-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 100 requested hosts map to the minimal /25 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.40.9.1 (first usable IP).
- **Governing Inputs:** `{"hosts":100,"inputIndex":3,"prefix":25}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.DESCENDING-CARVE] Allocated MGMT-NET as 10.40.9.128/27
- **Decision ID:** `VLSM.ALLOC-3-MGMT-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 30 requested hosts map to the minimal /27 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.40.9.129 (first usable IP).
- **Governing Inputs:** `{"hosts":30,"inputIndex":0,"prefix":27}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.CAPACITY] Root-block utilization 3.75%
- **Decision ID:** `VLSM.UTILIZATION`
- **Governing Rule:** `VLSM.CAPACITY`
- **Technical Rationale:**
  - (2456 usable addresses of 65534 in 10.40.0.0/16, 4 blocks carved, 63072 address(es) left free.
- **Governing Inputs:** `{"allocatedCapacity":2456,"rootCapacity":65534}`
- **Normative References:** RFC 950

##### [VLSM.INVARIANT] No-overlap invariant holds across all allocations.
- **Decision ID:** `VLSM.NO-OVERLAP`
- **Governing Rule:** `VLSM.INVARIANT`
- **Technical Rationale:**
  - Monotone carving guarantees non-intersection; verified with an O(n) boundary assertion.
- **Governing Inputs:** `{"count":4}`
- **Normative References:** RFC 950

#### Domain: ROUTING

##### [ROUTING.03] Selected OSPF + eBGP multi-domain routing architecture
- **Decision ID:** `ROUTING.PROTOCOL.OSPF-EBGP`
- **Governing Rule:** `ROUTING.03`
- **Technical Rationale:**
  - Enterprise Autonomous System AS 65001 connects to external Cloud VPC boundary. eBGP handles policy-based inter-AS exchange (RFC 4271), while multi-area OSPF isolates internal enterprise areas.
- **Governing Inputs:** `{"asNumber":65001,"subnetCount":4,"cloudVpcProvider":"aws","distinctAutonomousSystems":true}`
- **Normative References:** RFC 4271 BGP-4, RFC 4364 BGP/MPLS IP VPNs, RFC 2328 OSPFv2

##### [ROUTING.04] Configured 1 OSPF area(s) with 4 network statements
- **Decision ID:** `ROUTING.OSPF.AREAS`
- **Governing Rule:** `ROUTING.04`
- **Technical Rationale:**
  - Network statements map exact network-aligned CIDRs and inverse wildcard masks directly from the VLSM plan, ensuring flawless LSDB population.
- **Governing Inputs:** `{"areasCount":1,"totalNetworks":4}`
- **Normative References:** RFC 2328 Section 3.1, RFC 1878

##### [ROUTING.05] Established eBGP peering between Enterprise AS 65001 and Cloud Provider AS 64512
- **Decision ID:** `ROUTING.BGP.EBGP-PEERING`
- **Governing Rule:** `ROUTING.05`
- **Technical Rationale:**
  - eBGP session advertises summarized enterprise supernet towards Cloud VPC peer IP to prevent routing table bloat and enforce policy separation.
- **Governing Inputs:** `{"localAs":65001,"remoteAs":64512,"peerIps":["203.0.113.10","203.0.113.11"]}`
- **Normative References:** RFC 4271 BGP-4, RFC 6996 Autonomous System Number Reservation

##### [ROUTING.06] Planned deterministic route failover across 1 circuit pair(s)
- **Decision ID:** `ROUTING.FAILOVER.METRIC-STEERING`
- **Governing Rule:** `ROUTING.06`
- **Technical Rationale:**
  - Primary circuits are biased with metric 10 while secondary circuits carry metric 20, guaranteeing hitless failover upon primary link flap.
- **Governing Inputs:** `{"failoverPairs":1}`
- **Normative References:** Cisco Resilient Network Design, RFC 2328 Cost Metric Semantics

#### Domain: SECURITY

##### [SEC.01] Configured 2 IKEv2 site-to-site IPsec tunnel(s) toward Cloud VPC
- **Decision ID:** `ROUTING.SECURITY.IPSEC-IKEV2`
- **Governing Rule:** `SEC.01`
- **Technical Rationale:**
  - IKEv2 protects transit between enterprise border routers and Cloud VPC with AES-256-GCM encryption and SHA-384 integrity (RFC 7296).
- **Governing Inputs:** `{"tunnelsCount":2,"peerIps":["203.0.113.10","203.0.113.11"]}`
- **Normative References:** RFC 7296 IKEv2, NIST SP 800-77

## 10. Configuration Artifact Inventory

| Device ID | Hostname | Generated Configuration File | Lines of IOS Code |
|---|---|---|---|
| `RTR-CITY-D` | **WAN Router Delhi HQ (Logistics Control)** | `exports/global/RTR-CITY-D.ios` | 103 lines |
| `RTR-CITY-M` | **WAN Router Mumbai Distribution** | `exports/global/RTR-CITY-M.ios` | 56 lines |
| `RTR-CITY-K` | **WAN Router Kolkata Scanners** | `exports/global/RTR-CITY-K.ios` | 56 lines |
| `RTR-CITY-C` | **WAN Router Chennai Scanners** | `exports/global/RTR-CITY-C.ios` | 56 lines |
| `GW-CLOUD-VPC` | **Cloud VPN Gateway (AWS VGW)** | `exports/global/GW-CLOUD-VPC.ios` | 60 lines |

## 11. Documented Assumptions & Technical Limitations

- Media reach limits are enforced per IEEE 802.3 clauses: Cat6a <= 100m, OM4 MMF <= 400m, OS2 SMF 10GBASE-LR <= 10km, 10GBASE-ER <= 40km.
- Campus wireless AP density assumes 1 AP per 24 endpoints with 802.3at PoE+ power requirements.
- Access switch port planning incorporates a 20% growth headroom on active drops with 4 reserved uplink ports.
- Metro MAN transport models EVPL latency using 5 us/km propagation delay + 100 us per-hop switching delay against the 5ms SLA.
- Packet Tracer compatibility mode emits standard IOS syntax supported by Catalyst 2960/3560 and ISR 4331/2911 devices.
- IPsec encapsulation overhead (~73 bytes per packet) is documented but does not reduce nominal line-rate sizing in release 1.

## 12. Fail-Closed Verification Audit Trail

**Overall Verification Gate:** PASSED ✅

| Check ID | Verification Rule | Status | Diagnostic Detail |
|---|---|---|---|
| `V-01` | **Bitwise Zero-Overlap Invariant** | PASS ✅ | All allocated subnets are strictly disjoint (zero overlap). |
| `V-02` | **Root Network Containment Check** | PASS ✅ | All subnets are contained within root block 10.40.0.0/16. |
| `V-03` | **Gateway Subnet Belonging Check** | PASS ✅ | All gateway IP addresses belong to their respective subnet address blocks. |
| `V-04` | **Wildcard Mask Inversion Check** | PASS ✅ | All wildcard masks independently verified against bitwise complement (~netmask). |
| `V-05` | **Host Capacity Sufficiency Check** | PASS ✅ | All carved subnets provide usable host capacity >= requested demand. |
| `V-06` | **VLAN Safety & Native Hardening Check** | PASS ✅ | VLAN IDs are unique, within range 1..4094, and native VLAN 99 is unused for access. |
| `V-07` | **Link Endpoint Existence Check** | PASS ✅ | All physical and logical links terminate on valid, known devices. |
| `V-08` | **Physical Media Feasibility Check** | PASS ✅ | All physical link runs strictly obey IEEE 802.3 transceiver reach limits. |
| `V-09` | **Routing Advertisement Consistency Check** | PASS ✅ | All OSPF network statements map directly to allocated VLSM subnets. |

---
*Report generated by NetArchitect Recommendation & Config Engine (CIC-307).*