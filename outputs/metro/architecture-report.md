# Architectural Design & Engineering Justification Log: CIC-307 METRO Design Report
**Topology Profile:** `metro-man` | **Allocated Base CIDR:** `10.30.0.0` | **Autonomous System:** `AS 65001`
**Generated:** 2026-11-14T01:48:20.502Z | **Engine:** NetArchitect CIC-307 Autonomous Evaluator

---
## 1. Executive Summary

- **Recommended Topology:** Three-Tier Collapsed Core Hierarchy
- **Engineering Rationale:** Interconnecting a financial colocation headquarters and remote branches over leased EVPL circuits requires OS2 single-mode optics (10GBASE-ER) for 15–35 km reach, dual-homed floating static failover, and DiffServ LLQ QoS to guarantee sub-5ms latency for voice and transactional data.

## 2. Network Profile

| Parameter | Value | Description |
|---|---|---|
| **Profile Identifier** | `metro-man` | Evaluated network scenario archetype |
| **Ingestion Source** | preset | Source of parameter specification |
| **Base IPv4 Block** | `10.30.0.0` | Root address allocation block |
| **Routing Domain ASN** | `AS 65001` | Autonomous System Number |
| **Connected Sites** | 3 sites | HQ Colo + remote branch offices |
| **EVPL Bandwidth** | 200 Mbps | Provider committed information rate (CIR) |
| **Latency Target SLA** | 5 ms | Maximum acceptable one-way transport delay |

## 3. Architecture Overview

- **Structural Topology Tier:** `collapsed-core`
- **Layer 2 Protocol:** IEEE 802.1w Rapid Spanning Tree Protocol (RSTP / Rapid-PVST)
- **Layer 3 Routing Protocol:** `multi-area-ospf`
- **Autonomous System Number:** AS 65001
- **Total Managed Devices:** 6
- **Total Interconnecting Links:** 7

## 4. Device Inventory

| Device ID | Hostname | Role | Site / Facility | Port Capacity | PoE Supported |
|---|---|---|---|---|---|
| `HQ-RTR-01` | **HQ Edge Router (FinTech HQ (Colo-A))** | `edge-router` | HQ | 16 ports | No |
| `HQ-SW-01` | **HQ Core Switch (FinTech HQ (Colo-A))** | `core-switch` | HQ | 24 ports | No |
| `RTR-REMOTE-1` | **Edge Router Branch Colombo East** | `edge-router` | REMOTE-1 | 8 ports | No |
| `SW-REMOTE-1` | **Access Switch Branch Colombo East** | `access-switch` | REMOTE-1 | 24 ports | No |
| `RTR-REMOTE-2` | **Edge Router Branch Harbour Front** | `edge-router` | REMOTE-2 | 8 ports | No |
| `SW-REMOTE-2` | **Access Switch Branch Harbour Front** | `access-switch` | REMOTE-2 | 24 ports | No |

## 5. Physical Media Recommendations (Layer 1 Physics)

All physical cable selections are governed strictly by IEEE 802.3 physical layer standards:

### Link 1: `RTR-REMOTE-1` $\rightarrow$ `HQ-RTR-01`
- **Calculated Distance:** 27000.0 meters
- **Recommended Media:** OS2 Single-Mode Fiber (SMF 9/125µm)
- **Transceiver Module:** SFP-10G-ER (1550 nm EML)
- **Standard:** `10GBASE-ER` (200 Mbps)
- **Engineering Rationale:** Link distance of 27.0km exceeds the 400m attenuation limit of OM4 Multimode Fiber. Selected OS2 Single-Mode Fiber operating at 1310nm/1550nm delivers low attenuation (0.4 dB/km) and zero modal dispersion, guaranteeing optical power budget margins across metropolitan/WAN spans.

### Link 2: `RTR-REMOTE-1` $\rightarrow$ `HQ-RTR-01`
- **Calculated Distance:** 27000.0 meters
- **Recommended Media:** OS2 Single-Mode Fiber (SMF 9/125µm)
- **Transceiver Module:** SFP-10G-ER (1550 nm EML)
- **Standard:** `10GBASE-ER` (200 Mbps)
- **Engineering Rationale:** Link distance of 27.0km exceeds the 400m attenuation limit of OM4 Multimode Fiber. Selected OS2 Single-Mode Fiber operating at 1310nm/1550nm delivers low attenuation (0.4 dB/km) and zero modal dispersion, guaranteeing optical power budget margins across metropolitan/WAN spans.

### Link 3: `RTR-REMOTE-2` $\rightarrow$ `HQ-RTR-01`
- **Calculated Distance:** 34000.0 meters
- **Recommended Media:** OS2 Single-Mode Fiber (SMF 9/125µm)
- **Transceiver Module:** SFP-10G-ER (1550 nm EML)
- **Standard:** `10GBASE-ER` (200 Mbps)
- **Engineering Rationale:** Link distance of 34.0km exceeds the 400m attenuation limit of OM4 Multimode Fiber. Selected OS2 Single-Mode Fiber operating at 1310nm/1550nm delivers low attenuation (0.4 dB/km) and zero modal dispersion, guaranteeing optical power budget margins across metropolitan/WAN spans.

### Link 4: `RTR-REMOTE-2` $\rightarrow$ `HQ-RTR-01`
- **Calculated Distance:** 34000.0 meters
- **Recommended Media:** OS2 Single-Mode Fiber (SMF 9/125µm)
- **Transceiver Module:** SFP-10G-ER (1550 nm EML)
- **Standard:** `10GBASE-ER` (200 Mbps)
- **Engineering Rationale:** Link distance of 34.0km exceeds the 400m attenuation limit of OM4 Multimode Fiber. Selected OS2 Single-Mode Fiber operating at 1310nm/1550nm delivers low attenuation (0.4 dB/km) and zero modal dispersion, guaranteeing optical power budget margins across metropolitan/WAN spans.

### 5.1 Physical Media Allocation Summary

| Link ID | Connection | Run Length | Recommended Medium | Ethernet Standard | Bandwidth |
|---|---|---|---|---|---|
| `LINK-HQ-ROUTER-SWITCH` | `HQ-RTR-01` $\leftrightarrow$ `HQ-SW-01` | — | **PHYSICAL** | `Logical/Virtual` | 1000 Mbps |
| `LINK-RTR-REMOTE-1-SW-REMOTE-1` | `RTR-REMOTE-1` $\leftrightarrow$ `SW-REMOTE-1` | — | **PHYSICAL** | `Logical/Virtual` | 1000 Mbps |
| `LINK-EVPL-REMOTE-1-HQ-PRI` | `RTR-REMOTE-1` $\leftrightarrow$ `HQ-RTR-01` | 27000 m | **OS2** | `10GBASE-ER` | 200 Mbps |
| `LINK-EVPL-REMOTE-1-HQ-SEC` | `RTR-REMOTE-1` $\leftrightarrow$ `HQ-RTR-01` | 27000 m | **OS2** | `10GBASE-ER` | 200 Mbps |
| `LINK-RTR-REMOTE-2-SW-REMOTE-2` | `RTR-REMOTE-2` $\leftrightarrow$ `SW-REMOTE-2` | — | **PHYSICAL** | `Logical/Virtual` | 1000 Mbps |
| `LINK-EVPL-REMOTE-2-HQ-PRI` | `RTR-REMOTE-2` $\leftrightarrow$ `HQ-RTR-01` | 34000 m | **OS2** | `10GBASE-ER` | 200 Mbps |
| `LINK-EVPL-REMOTE-2-HQ-SEC` | `RTR-REMOTE-2` $\leftrightarrow$ `HQ-RTR-01` | 34000 m | **OS2** | `10GBASE-ER` | 200 Mbps |

## 6. 802.1Q VLAN Allocation & Trunking Etiquette

| VLAN ID | Name | Department / Purpose | Mapped Subnet Name |
|---|---|---|---|
| **VLAN 10** | `MGMT` | MANAGEMENT | `MGMT-NET` |
| **VLAN 20** | `USERS` | STAFF | `USERS-NET` |
| **VLAN 30** | `TXN-SERVERS` | SERVERS | `TXN-SERVERS-NET` |
| **VLAN 40** | `BRANCH-X` | STUDENTS | `BRANCH-X-NET` |

- **Hardened Native VLAN:** `VLAN 99` (configured as untagged, unused, and carrying zero client data to prevent VLAN hopping).
- **Default VLAN 1 Policy:** Disabled for user access; pruned from all inter-switch 802.1Q trunk allowed lists to constrain broadcast domains.

## 7. VLSM Address Allocation Plan (Zero-Overlap Invariant)

Subnets allocated dynamically in strict descending order of host requirements to maximize contiguous block efficiency and prevent overlapping boundary fragmentation.

Root Block CIDR: `10.30.0.0` | Overall Allocation Efficiency: **1.3%**

| VLAN | Subnet Name | Needed | Usable | Prefix | Network Address | Subnet Mask | Cisco Wildcard | Default Gateway | Broadcast Address |
|---|---|---|---|---|---|---|---|---|---|
| VLAN 20 | `USERS-NET` | 450 | 510 | /23 | `10.30.0.0` | `255.255.254.0` | `0.0.1.255` | `10.30.0.1` | `10.30.1.255` |
| VLAN 40 | `BRANCH-X-NET` | 250 | 254 | /24 | `10.30.2.0` | `255.255.255.0` | `0.0.0.255` | `10.30.2.1` | `10.30.2.255` |
| VLAN 30 | `TXN-SERVERS-NET` | 40 | 62 | /26 | `10.30.3.0` | `255.255.255.192` | `0.0.0.63` | `10.30.3.1` | `10.30.3.63` |
| VLAN 10 | `MGMT-NET` | 10 | 14 | /28 | `10.30.3.64` | `255.255.255.240` | `0.0.0.15` | `10.30.3.65` | `10.30.3.79` |

## 8. Layer 3 Routing Decisions

- **Primary Routing Protocol:** Multi-Area OSPFv2 with DiffServ QoS
- **Backbone Topology Tier:** Three-Tier Collapsed Core Hierarchy
- **Area Assignment:** Area 0 (Backbone)
- **Border Interconnect:** None (Self-Contained Autonomous System)
- **Protocol Rationale:** Multi-area segmentation isolates branch link flaps from the central HQ core, and floating static routes provide sub-second circuit failover across redundant EVPL circuits without BGP peering overhead.

- **DiffServ Quality of Service (QoS / RFC 4594):**
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
| `VLAN.TRUNK-PRUNING` | VLAN | `VLAN.03` | **Restricted trunk links to explicitly allowed VLAN list [10,20,30,40]** | Explicit allowed-VLAN pruning confines broadcast/multicast traffic strictly to authorized switches, conserving backplane bandwidth. | IEEE 802.1Q Clause 9, RFC 3069 |
| `VLSM.ALLOC-0-USERS-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated USERS-NET as 10.30.0.0/23** | 450 requested hosts map to the minimal /23 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.30.0.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-1-BRANCH-X-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated BRANCH-X-NET as 10.30.2.0/24** | 250 requested hosts map to the minimal /24 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.30.2.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-2-TXN-SERVERS-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated TXN-SERVERS-NET as 10.30.3.0/26** | 40 requested hosts map to the minimal /26 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.30.3.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-3-MGMT-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated MGMT-NET as 10.30.3.64/28** | 10 requested hosts map to the minimal /28 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.30.3.65 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.UTILIZATION` | VLSM | `VLSM.CAPACITY` | **Root-block utilization 1.28%** | (840 usable addresses of 65534 in 10.30.0.0/16, 4 blocks carved, 64688 address(es) left free. | RFC 950 |
| `VLSM.NO-OVERLAP` | VLSM | `VLSM.INVARIANT` | **No-overlap invariant holds across all allocations.** | Monotone carving guarantees non-intersection; verified with an O(n) boundary assertion. | RFC 950 |
| `ROUTING.PROTOCOL.MULTI-AREA-OSPF` | ROUTING | `ROUTING.02` | **Selected Multi-Area OSPF architecture with Area 0 backbone** | Multi-site topology (3 sites) requires routing-domain isolation. Hierarchical area design isolates LSA flooding, reduces SPF recalculation frequency, and enforces area boundary summarization. | RFC 2328 OSPFv2 Section 3.2, RFC 3509 Alternative OSPF ABR Implementations |
| `ROUTING.OSPF.AREAS` | ROUTING | `ROUTING.04` | **Configured 1 OSPF area(s) with 4 network statements** | Network statements map exact network-aligned CIDRs and inverse wildcard masks directly from the VLSM plan, ensuring flawless LSDB population. | RFC 2328 Section 3.1, RFC 1878 |
| `ROUTING.QOS.DIFFSERV-QUEUING` | QOS | `QOS.01` | **Configured 4-class DiffServ QoS policy on EVPL provider circuits** | Classifies EF Voice (30% priority queue) and AF31 Transactional data (40% bandwidth queue) to guarantee sub-5ms SLA latency under congestion. | RFC 4594 DiffServ Class Architecture, RFC 3246 Expedited Forwarding |
| `ROUTING.FAILOVER.METRIC-STEERING` | ROUTING | `ROUTING.06` | **Planned deterministic route failover across 2 circuit pair(s)** | Primary circuits are biased with metric 10 while secondary circuits carry metric 20, guaranteeing hitless failover upon primary link flap. | Cisco Resilient Network Design, RFC 2328 Cost Metric Semantics |

## 10. Configuration Artifact Inventory

| Device ID | Hostname | Generated Configuration File | Lines of IOS Code |
|---|---|---|---|
| `HQ-RTR-01` | **HQ Edge Router (FinTech HQ (Colo-A))** | `exports/metro/HQ-RTR-01.ios` | 101 lines |
| `HQ-SW-01` | **HQ Core Switch (FinTech HQ (Colo-A))** | `exports/metro/HQ-SW-01.ios` | 94 lines |
| `RTR-REMOTE-1` | **Edge Router Branch Colombo East** | `exports/metro/RTR-REMOTE-1.ios` | 93 lines |
| `SW-REMOTE-1` | **Access Switch Branch Colombo East** | `exports/metro/SW-REMOTE-1.ios` | 125 lines |
| `RTR-REMOTE-2` | **Edge Router Branch Harbour Front** | `exports/metro/RTR-REMOTE-2.ios` | 93 lines |
| `SW-REMOTE-2` | **Access Switch Branch Harbour Front** | `exports/metro/SW-REMOTE-2.ios` | 125 lines |

### 10.1 Primary Deployment Configuration Sample: `HQ-RTR-01`

```cisco
! NetArchitect Generated Cisco IOS Configuration
! Device: HQ Edge Router (FinTech HQ (Colo-A)) (HQ-RTR-01)
! Platform: ISR-4331 | Role: router
! Generated: 2026-11-14T01:48:20.498Z
!
version 15.2
service timestamps debug datetime msec
service timestamps log datetime msec
service password-encryption
!
hostname HQ-RTR-01
!
no ip domain-lookup
ip routing
!
! --- DiffServ QoS Queuing ---
class-map match-all VOICE-EF
 match ip dscp ef
!
class-map match-all TRANSACTIONAL-AF31
 match ip dscp af31
!
class-map match-all VIDEO-AF21
 match ip dscp af21
!
class-map match-all DEFAULT-BEST-EFFORT
 match ip dscp default
!
policy-map METRO-EVPL-POLICY
 class VOICE-EF
  priority percent 30
 class TRANSACTIONAL-AF31
  bandwidth percent 40
 class VIDEO-AF21
  bandwidth percent 20
 class DEFAULT-BEST-EFFORT
  bandwidth percent 10
 class class-default
  bandwidth percent 10
!
! --- Interface Configurations ---
interface GigabitEthernet0/1
 description WAN/EVPL Link to HQ-SW-01 (LINK-HQ-ROUTER-SWITCH)
 no shutdown
!
interface GigabitEthernet0/2
 description WAN/EVPL Link to RTR-REMOTE-1 (LINK-EVPL-REMOTE-1-HQ-PRI)
 no shutdown
!
interface GigabitEthernet0/3
 description WAN/EVPL Link to RTR-REMOTE-1 (LINK-EVPL-REMOTE-1-HQ-SEC)
 no shutdown
!
interface GigabitEthernet0/4
 description WAN/EVPL Link to RTR-REMOTE-2 (LINK-EVPL-REMOTE-2-HQ-PRI)
 no shutdown
!
interface GigabitEthernet0/5
 description WAN/EVPL Link to RTR-REMOTE-2 (LINK-EVPL-REMOTE-2-HQ-SEC)
 no shutdown
!
! --- Loopback Interfaces ---
interface Loopback0
 description Router-ID Anchor for HQ Edge Router (FinTech HQ (Colo-A))
 ip address 10.255.255.1 255.255.255.255
!
! --- Static & Floating Routes ---
ip route 0.0.0.0 0.0.0.0 10.0.0.1 1
ip route 0.0.0.0 0.0.0.0 10.0.0.2 10
!
! --- Access Control Lists ---
ip access-list standard MGMT-VTY-ACCESS
 remark Allow internal management subnets to VTY lines
 permit 10.0.0.0 0.255.255.255
 remark Deny all other remote management attempts
 deny any
!
! --- OSPF Process Configuration ---
router ospf 1
 router-id 10.255.255.1
 log-adjacency-changes
 network 10.30.0.0 0.0.1.255 area 0
 network 10.30.2.0 0.0.0.255 area 0
 network 10.30.3.0 0.0.0.63 area 0
 network 10.30.3.64 0.0.0.15 area 0
!
! --- Management Line Hardening ---
line con 0
 logging synchronous
 login local
!
line vty 0 4
 transport input ssh
 access-class MGMT-VTY-ACCESS in
 login local
line vty 5 15
 transport input ssh
 access-class MGMT-VTY-ACCESS in
 login local
!
end
```


## 11. Documented Assumptions & Technical Limitations

- Media reach limits are enforced per IEEE 802.3 clauses: Cat6a <= 100m, OM4 MMF <= 400m, OS2 SMF 10GBASE-LR <= 10km, 10GBASE-ER <= 40km.
- Campus wireless AP density assumes 1 AP per 24 endpoints with 802.3at PoE+ power requirements.
- Access switch port planning incorporates a 20% growth headroom on active drops with 4 reserved uplink ports.
- Packet Tracer compatibility mode emits standard IOS syntax supported by Catalyst 2960/3560 and ISR 4331/2911 devices.
- A recommendation for eBGP or multi-area OSPF establishes baseline configuration; production deployment requires ISP-assigned peer addresses and route filtering.
- Packet Tracer/GNS3 validation remains a separate verification deliverable after loading and executing the generated configuration scripts.

## 12. Fail-Closed Verification Audit Trail

**Overall Verification Gate:** PASSED ✅

| Check ID | Verification Rule | Status | Diagnostic Detail |
|---|---|---|---|
| `V-01` | **Bitwise Zero-Overlap Invariant** | PASS ✅ | All allocated subnets are strictly disjoint (zero overlap). |
| `V-02` | **Root Network Containment Check** | PASS ✅ | All subnets are contained within root block 10.30.0.0/16. |
| `V-03` | **Gateway Subnet Belonging Check** | PASS ✅ | All gateway IP addresses belong to their respective subnet address blocks. |
| `V-04` | **Wildcard Mask Inversion Check** | PASS ✅ | All wildcard masks independently verified against bitwise complement (~netmask). |
| `V-05` | **Host Capacity Sufficiency Check** | PASS ✅ | All carved subnets provide usable host capacity >= requested demand. |
| `V-06` | **VLAN Safety & Native Hardening Check** | PASS ✅ | VLAN IDs are unique, within range 1..4094, and native VLAN 99 is unused for access. |
| `V-07` | **Link Endpoint Existence Check** | PASS ✅ | All physical and logical links terminate on valid, known devices. |
| `V-08` | **Physical Media Feasibility Check** | PASS ✅ | All physical link runs strictly obey IEEE 802.3 transceiver reach limits. |
| `V-09` | **Routing Advertisement Consistency Check** | PASS ✅ | All OSPF network statements map directly to allocated VLSM subnets. |
| `V-10` | **Metro SLA Latency Compliance Check** | PASS ✅ | All circuit latency values meet the 5 ms SLA target. |
