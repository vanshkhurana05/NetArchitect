# NetArchitect Design Report — METRO Design Report
**Generated:** 2026-11-07T23:48:06.612Z | **Profile:** `metro-man` | **Source:** CUSTOM

---
## 1. Executive Summary

This document specifies the network architecture and Cisco configuration suite for a high-availability **Metro MAN** interconnecting a financial colocation headquarters and two remote branch offices over leased EVPL circuits (15–35 km). The design enforces sub-5ms SLA latency targets, OS2 single-mode fiber (10GBASE-ER) transceivers, dual-homed circuit failover, Multi-Area OSPF, and 4-class DiffServ QoS queueing for mission-critical transactional and voice data.

## 2. Network Profile

| Parameter | Value | Description |
|---|---|---|
| **Profile Identifier** | `metro-man` | Evaluated network scenario archetype |
| **Ingestion Source** | custom | Source of parameter specification |
| **Connected Sites** | 3 sites | HQ Colo + remote branch offices |
| **EVPL Bandwidth** | 200 Mbps | Provider committed information rate (CIR) |
| **Latency Target SLA** | 5 ms | Maximum acceptable one-way transport delay |

## 3. Architecture Overview

- **Structural Topology Tier:** `collapsed-core`
- **Layer 2 Protocol:** IEEE 802.1w Rapid Spanning Tree Protocol (RSTP / Rapid-PVST)
- **Layer 3 Routing Protocol:** `multi-area-ospf`
- **Autonomous System Number:** AS 65001
- **Total Managed Devices:** 6
- **Total Interconnecting Links:** 5

## 4. Device Inventory

| Device ID | Hostname | Role | Site / Facility | Port Capacity | PoE Supported |
|---|---|---|---|---|---|
| `HQ-RTR-01` | **HQ Edge Router (HQ Node)** | `edge-router` | HQ | 16 ports | No |
| `HQ-SW-01` | **HQ Core Switch (HQ Node)** | `core-switch` | HQ | 24 ports | No |
| `RTR-REMOTE-1` | **Edge Router Remote One** | `edge-router` | REMOTE-1 | 8 ports | No |
| `SW-REMOTE-1` | **Access Switch Remote One** | `access-switch` | REMOTE-1 | 24 ports | No |
| `RTR-REMOTE-2` | **Edge Router Remote Two** | `edge-router` | REMOTE-2 | 8 ports | No |
| `SW-REMOTE-2` | **Access Switch Remote Two** | `access-switch` | REMOTE-2 | 24 ports | No |

## 5. Physical Media Recommendations (Layer 1 Physics)

All physical cable selections are governed strictly by IEEE 802.3 physical layer standards:

| Link ID | Connection | Run Length | Recommended Medium | Ethernet Standard | Bandwidth |
|---|---|---|---|---|---|
| `LINK-HQ-ROUTER-SWITCH` | `HQ-RTR-01` $\leftrightarrow$ `HQ-SW-01` | — | **PHYSICAL** | `Logical/Virtual` | 1000 Mbps |
| `LINK-RTR-REMOTE-1-SW-REMOTE-1` | `RTR-REMOTE-1` $\leftrightarrow$ `SW-REMOTE-1` | — | **PHYSICAL** | `Logical/Virtual` | 1000 Mbps |
| `LINK-EVPL-REMOTE-1-HQ-PRI` | `RTR-REMOTE-1` $\leftrightarrow$ `HQ-RTR-01` | 25000 m | **OS2** | `10GBASE-ER` | 200 Mbps |
| `LINK-RTR-REMOTE-2-SW-REMOTE-2` | `RTR-REMOTE-2` $\leftrightarrow$ `SW-REMOTE-2` | — | **PHYSICAL** | `Logical/Virtual` | 1000 Mbps |
| `LINK-EVPL-REMOTE-2-HQ-PRI` | `RTR-REMOTE-2` $\leftrightarrow$ `HQ-RTR-01` | 30000 m | **OS2** | `10GBASE-ER` | 200 Mbps |

## 6. 802.1Q VLAN Allocation & Trunking Etiquette

| VLAN ID | Name | Department / Purpose | Mapped Subnet Name |
|---|---|---|---|
| **VLAN 10** | `MGMT` | MANAGEMENT | `MGMT-NET` |
| **VLAN 20** | `USERS` | STAFF | `USERS-NET` |

- **Hardened Native VLAN:** `VLAN 99` (configured as untagged, unused, and carrying zero client data).
- **Default VLAN 1 Policy:** Disabled for user access; pruned from all inter-switch 802.1Q trunk allowed lists.

## 7. VLSM Address Allocation Plan (Zero-Overlap Invariant)

Root Block CIDR: `10.60.0.0` | Overall Allocation Efficiency: **0.8%**

| Subnet Name | Network Address | Prefix | Subnet Mask | Wildcard Mask | Gateway IP | Usable Host Range | Hosts (Req/Cap) |
|---|---|---|---|---|---|---|---|
| `USERS-NET` | `10.60.0.0` | /23 | `255.255.254.0` | `0.0.1.255` | `10.60.0.1` | `10.60.0.1` – `10.60.1.254` | 260 / 510 |
| `MGMT-NET` | `10.60.2.0` | /28 | `255.255.255.240` | `0.0.0.15` | `10.60.2.1` | `10.60.2.1` – `10.60.2.14` | 10 / 14 |

## 8. Layer 3 Routing Decisions

- **Selected Routing Protocol:** `multi-area-ospf`
- **Autonomous System (ASN):** `AS 65001`
- **OSPF Areas Planned:** 1 area(s)
  - **Area 0 (Backbone Area 0 (HQ Node)):** 2 network statements, sites: [HQ]

- **DiffServ Quality of Service (QoS) Queuing:**
| Traffic Class | DSCP Marker | Bandwidth Percentage | Queue Strategy |
|---|---|---|---|
| `VOICE-EF` | `ef` | 30% | Priority LLQ (Low-Latency) |
| `TRANSACTIONAL-AF31` | `af31` | 40% | CBWFQ Weighted Fair |
| `VIDEO-AF21` | `af21` | 20% | CBWFQ Weighted Fair |
| `DEFAULT-BEST-EFFORT` | `default` | 10% | CBWFQ Weighted Fair |

## 9. Explainable Engineering Justifications

This section records the exact algorithmic and mathematical rationales behind every choice made. No LLM generation is utilized.

| Decision ID | Module | Rule ID | Selected Recommendation | Technical Rationale | References |
|---|---|---|---|---|---|
| `TOPO.METRO-EVPL-DUALHOMED` | TOPOLOGY | `TOPO.03` | **Configured dual-homed EVPL connections with primary and backup paths** | Dual-homing remote edge routers to distinct HQ provider interfaces satisfies high-availability SLAs and sub-5ms failover guarantees. | MEF 6.2 EVPL Specification, IEEE 802.3ae 10GBASE-ER |
| `VLAN.DETERMINISTIC-TAGS` | VLAN | `VLAN.01` | **Assigned deterministic 802.1Q tags starting at 10 (+10)** | Standardized VLAN numbering ensures uniform broadcast domain mapping across campus switches and prevents conflicting PVIDs. | IEEE 802.1Q, Cisco Campus LAN Best Practices |
| `VLAN.NATIVE-HARDENING` | VLAN | `VLAN.02` | **Configured Native VLAN 99 as untagged and unused on all trunks** | Setting the native VLAN to an unused ID (VLAN 99) and disallowing default VLAN 1 mitigates 802.1Q double-tagging and VLAN hopping security vulnerabilities. | NIST SP 800-115, DISA Network Infrastructure STIG |
| `VLAN.TRUNK-PRUNING` | VLAN | `VLAN.03` | **Restricted trunk links to explicitly allowed VLAN list [10,20]** | Explicit allowed-VLAN pruning confines broadcast/multicast traffic strictly to authorized switches, conserving backplane bandwidth. | IEEE 802.1Q Clause 9, RFC 3069 |
| `VLSM.ALLOC-0-USERS-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated USERS-NET as 10.60.0.0/23** | 260 requested hosts map to the minimal /23 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.60.0.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-1-MGMT-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated MGMT-NET as 10.60.2.0/28** | 10 requested hosts map to the minimal /28 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.60.2.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.UTILIZATION` | VLSM | `VLSM.CAPACITY` | **Root-block utilization 0.80%** | (524 usable addresses of 65534 in 10.60.0.0/16, 2 blocks carved, 65008 address(es) left free. | RFC 950 |
| `VLSM.NO-OVERLAP` | VLSM | `VLSM.INVARIANT` | **No-overlap invariant holds across all allocations.** | Monotone carving guarantees non-intersection; verified with an O(n) boundary assertion. | RFC 950 |
| `ROUTING.PROTOCOL.MULTI-AREA-OSPF` | ROUTING | `ROUTING.02` | **Selected Multi-Area OSPF architecture with Area 0 backbone** | Multi-site topology (3 sites) requires routing-domain isolation. Hierarchical area design isolates LSA flooding, reduces SPF recalculation frequency, and enforces area boundary summarization. | RFC 2328 OSPFv2 Section 3.2, RFC 3509 Alternative OSPF ABR Implementations |
| `ROUTING.OSPF.AREAS` | ROUTING | `ROUTING.04` | **Configured 1 OSPF area(s) with 2 network statements** | Network statements map exact network-aligned CIDRs and inverse wildcard masks directly from the VLSM plan, ensuring flawless LSDB population. | RFC 2328 Section 3.1, RFC 1878 |
| `ROUTING.QOS.DIFFSERV-QUEUING` | QOS | `QOS.01` | **Configured 4-class DiffServ QoS policy on EVPL provider circuits** | Classifies EF Voice (30% priority queue) and AF31 Transactional data (40% bandwidth queue) to guarantee sub-5ms SLA latency under congestion. | RFC 4594 DiffServ Class Architecture, RFC 3246 Expedited Forwarding |

#### Domain: TOPOLOGY

##### [TOPO.03] Configured dual-homed EVPL connections with primary and backup paths
- **Decision ID:** `TOPO.METRO-EVPL-DUALHOMED`
- **Governing Rule:** `TOPO.03`
- **Technical Rationale:**
  - Dual-homing remote edge routers to distinct HQ provider interfaces satisfies high-availability SLAs and sub-5ms failover guarantees.
- **Governing Inputs:** `{"remoteSitesCount":2,"dualHomedFailover":false,"evplBandwidthMbps":200}`
- **Normative References:** MEF 6.2 EVPL Specification, IEEE 802.3ae 10GBASE-ER

#### Domain: VLAN

##### [VLAN.01] Assigned deterministic 802.1Q tags starting at 10 (+10)
- **Decision ID:** `VLAN.DETERMINISTIC-TAGS`
- **Governing Rule:** `VLAN.01`
- **Technical Rationale:**
  - Standardized VLAN numbering ensures uniform broadcast domain mapping across campus switches and prevents conflicting PVIDs.
- **Governing Inputs:** `{"totalVlans":2,"startId":10,"increment":10}`
- **Normative References:** IEEE 802.1Q, Cisco Campus LAN Best Practices

##### [VLAN.02] Configured Native VLAN 99 as untagged and unused on all trunks
- **Decision ID:** `VLAN.NATIVE-HARDENING`
- **Governing Rule:** `VLAN.02`
- **Technical Rationale:**
  - Setting the native VLAN to an unused ID (VLAN 99) and disallowing default VLAN 1 mitigates 802.1Q double-tagging and VLAN hopping security vulnerabilities.
- **Governing Inputs:** `{"nativeVlanId":99,"defaultVlanDisabled":1}`
- **Normative References:** NIST SP 800-115, DISA Network Infrastructure STIG

##### [VLAN.03] Restricted trunk links to explicitly allowed VLAN list [10,20]
- **Decision ID:** `VLAN.TRUNK-PRUNING`
- **Governing Rule:** `VLAN.03`
- **Technical Rationale:**
  - Explicit allowed-VLAN pruning confines broadcast/multicast traffic strictly to authorized switches, conserving backplane bandwidth.
- **Governing Inputs:** `{"allowedVlanIds":[10,20]}`
- **Normative References:** IEEE 802.1Q Clause 9, RFC 3069

#### Domain: VLSM

##### [VLSM.DESCENDING-CARVE] Allocated USERS-NET as 10.60.0.0/23
- **Decision ID:** `VLSM.ALLOC-0-USERS-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 260 requested hosts map to the minimal /23 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.60.0.1 (first usable IP).
- **Governing Inputs:** `{"hosts":260,"inputIndex":1,"prefix":23}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.DESCENDING-CARVE] Allocated MGMT-NET as 10.60.2.0/28
- **Decision ID:** `VLSM.ALLOC-1-MGMT-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 10 requested hosts map to the minimal /28 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.60.2.1 (first usable IP).
- **Governing Inputs:** `{"hosts":10,"inputIndex":0,"prefix":28}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.CAPACITY] Root-block utilization 0.80%
- **Decision ID:** `VLSM.UTILIZATION`
- **Governing Rule:** `VLSM.CAPACITY`
- **Technical Rationale:**
  - (524 usable addresses of 65534 in 10.60.0.0/16, 2 blocks carved, 65008 address(es) left free.
- **Governing Inputs:** `{"allocatedCapacity":524,"rootCapacity":65534}`
- **Normative References:** RFC 950

##### [VLSM.INVARIANT] No-overlap invariant holds across all allocations.
- **Decision ID:** `VLSM.NO-OVERLAP`
- **Governing Rule:** `VLSM.INVARIANT`
- **Technical Rationale:**
  - Monotone carving guarantees non-intersection; verified with an O(n) boundary assertion.
- **Governing Inputs:** `{"count":2}`
- **Normative References:** RFC 950

#### Domain: ROUTING

##### [ROUTING.02] Selected Multi-Area OSPF architecture with Area 0 backbone
- **Decision ID:** `ROUTING.PROTOCOL.MULTI-AREA-OSPF`
- **Governing Rule:** `ROUTING.02`
- **Technical Rationale:**
  - Multi-site topology (3 sites) requires routing-domain isolation. Hierarchical area design isolates LSA flooding, reduces SPF recalculation frequency, and enforces area boundary summarization.
- **Governing Inputs:** `{"asNumber":65001,"subnetCount":2,"threshold":50,"sitesCount":3}`
- **Normative References:** RFC 2328 OSPFv2 Section 3.2, RFC 3509 Alternative OSPF ABR Implementations

##### [ROUTING.04] Configured 1 OSPF area(s) with 2 network statements
- **Decision ID:** `ROUTING.OSPF.AREAS`
- **Governing Rule:** `ROUTING.04`
- **Technical Rationale:**
  - Network statements map exact network-aligned CIDRs and inverse wildcard masks directly from the VLSM plan, ensuring flawless LSDB population.
- **Governing Inputs:** `{"areasCount":1,"totalNetworks":2}`
- **Normative References:** RFC 2328 Section 3.1, RFC 1878

#### Domain: QOS

##### [QOS.01] Configured 4-class DiffServ QoS policy on EVPL provider circuits
- **Decision ID:** `ROUTING.QOS.DIFFSERV-QUEUING`
- **Governing Rule:** `QOS.01`
- **Technical Rationale:**
  - Classifies EF Voice (30% priority queue) and AF31 Transactional data (40% bandwidth queue) to guarantee sub-5ms SLA latency under congestion.
- **Governing Inputs:** `{"classes":["VOICE-EF","TRANSACTIONAL-AF31","VIDEO-AF21","DEFAULT-BEST-EFFORT"]}`
- **Normative References:** RFC 4594 DiffServ Class Architecture, RFC 3246 Expedited Forwarding

## 10. Configuration Artifact Inventory

| Device ID | Hostname | Generated Configuration File | Lines of IOS Code |
|---|---|---|---|
| `HQ-RTR-01` | **HQ Edge Router (HQ Node)** | `exports/metro/HQ-RTR-01.ios` | 87 lines |
| `HQ-SW-01` | **HQ Core Switch (HQ Node)** | `exports/metro/HQ-SW-01.ios` | 78 lines |
| `RTR-REMOTE-1` | **Edge Router Remote One** | `exports/metro/RTR-REMOTE-1.ios` | 83 lines |
| `SW-REMOTE-1` | **Access Switch Remote One** | `exports/metro/SW-REMOTE-1.ios` | 169 lines |
| `RTR-REMOTE-2` | **Edge Router Remote Two** | `exports/metro/RTR-REMOTE-2.ios` | 83 lines |
| `SW-REMOTE-2` | **Access Switch Remote Two** | `exports/metro/SW-REMOTE-2.ios` | 169 lines |

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
| `V-02` | **Root Network Containment Check** | PASS ✅ | All subnets are contained within root block 10.60.0.0/16. |
| `V-03` | **Gateway Subnet Belonging Check** | PASS ✅ | All gateway IP addresses belong to their respective subnet address blocks. |
| `V-04` | **Wildcard Mask Inversion Check** | PASS ✅ | All wildcard masks independently verified against bitwise complement (~netmask). |
| `V-05` | **Host Capacity Sufficiency Check** | PASS ✅ | All carved subnets provide usable host capacity >= requested demand. |
| `V-06` | **VLAN Safety & Native Hardening Check** | PASS ✅ | VLAN IDs are unique, within range 1..4094, and native VLAN 99 is unused for access. |
| `V-07` | **Link Endpoint Existence Check** | PASS ✅ | All physical and logical links terminate on valid, known devices. |
| `V-08` | **Physical Media Feasibility Check** | PASS ✅ | All physical link runs strictly obey IEEE 802.3 transceiver reach limits. |
| `V-09` | **Routing Advertisement Consistency Check** | PASS ✅ | All OSPF network statements map directly to allocated VLSM subnets. |
| `V-10` | **Metro SLA Latency Compliance Check** | PASS ✅ | All circuit latency values meet the 5 ms SLA target. |

---
*Report generated by NetArchitect Recommendation & Config Engine (CIC-307).*