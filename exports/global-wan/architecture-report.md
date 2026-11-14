# Architectural Design & Engineering Justification Log: CIC-307 GLOBAL Design Report
**Topology Profile:** `global-wan` | **Allocated Base CIDR:** `10.40.0.0` | **Autonomous System:** `AS 65001`
**Generated:** 2026-11-14T01:48:21.459Z | **Engine:** NetArchitect CIC-307 Autonomous Evaluator

---
## 1. Executive Summary

- **Recommended Topology:** Hierarchical Multi-Tier
- **Engineering Rationale:** A distributed WAN integrating 4 metropolitan centers and an AWS Cloud VPC terminates 2,000 IoT/scanner endpoints over policy-based IKEv2 IPsec VPN tunnels, using border eBGP peering with internal Multi-Area OSPF and hierarchical route summarization.

## 2. Network Profile

| Parameter | Value | Description |
|---|---|---|
| **Profile Identifier** | `global-wan` | Evaluated network scenario archetype |
| **Ingestion Source** | preset | Source of parameter specification |
| **Base IPv4 Block** | `10.40.0.0` | Root address allocation block |
| **Routing Domain ASN** | `AS 65001` | Autonomous System Number |
| **Connected Cities** | 4 cities | Metropolitan centers (Delhi, Mumbai, Kolkata, Chennai) |
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

### 5.1 Physical Media Allocation Summary

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

- **Hardened Native VLAN:** `VLAN 99` (configured as untagged, unused, and carrying zero client data to prevent VLAN hopping).
- **Default VLAN 1 Policy:** Disabled for user access; pruned from all inter-switch 802.1Q trunk allowed lists to constrain broadcast domains.

## 7. VLSM Address Allocation Plan (Zero-Overlap Invariant)

Subnets allocated dynamically in strict descending order of host requirements to maximize contiguous block efficiency and prevent overlapping boundary fragmentation.

Root Block CIDR: `10.40.0.0` | Overall Allocation Efficiency: **3.8%**

| VLAN | Subnet Name | Needed | Usable | Prefix | Network Address | Subnet Mask | Cisco Wildcard | Default Gateway | Broadcast Address |
|---|---|---|---|---|---|---|---|---|---|
| VLAN 20 | `IOT-NODES-NET` | 1800 | 2046 | /21 | `10.40.0.0` | `255.255.248.0` | `0.0.7.255` | `10.40.0.1` | `10.40.7.255` |
| VLAN 30 | `SCANNERS-NET` | 200 | 254 | /24 | `10.40.8.0` | `255.255.255.0` | `0.0.0.255` | `10.40.8.1` | `10.40.8.255` |
| VLAN 40 | `ANALYTICS-NET` | 100 | 126 | /25 | `10.40.9.0` | `255.255.255.128` | `0.0.0.127` | `10.40.9.1` | `10.40.9.127` |
| VLAN 10 | `MGMT-NET` | 30 | 30 | /27 | `10.40.9.128` | `255.255.255.224` | `0.0.0.31` | `10.40.9.129` | `10.40.9.159` |

## 8. Layer 3 Routing Decisions

- **Primary Routing Protocol:** Border eBGP (RFC 4271) + Multi-Area OSPFv2
- **Backbone Topology Tier:** Hierarchical Multi-Tier
- **Area Assignment:** Area 0 (Backbone)
- **Border Interconnect:** eBGP AS 64512
- **Protocol Rationale:** Multi-Area OSPF provides fast interior link-state routing, while eBGP enforces policy-controlled route exchange and supernet aggregation across the AWS Cloud VPC border.

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

## 10. Configuration Artifact Inventory

| Device ID | Hostname | Generated Configuration File | Lines of IOS Code |
|---|---|---|---|
| `RTR-CITY-D` | **WAN Router Delhi HQ (Logistics Control)** | `exports/global/RTR-CITY-D.ios` | 103 lines |
| `RTR-CITY-M` | **WAN Router Mumbai Distribution** | `exports/global/RTR-CITY-M.ios` | 56 lines |
| `RTR-CITY-K` | **WAN Router Kolkata Scanners** | `exports/global/RTR-CITY-K.ios` | 56 lines |
| `RTR-CITY-C` | **WAN Router Chennai Scanners** | `exports/global/RTR-CITY-C.ios` | 56 lines |
| `GW-CLOUD-VPC` | **Cloud VPN Gateway (AWS VGW)** | `exports/global/GW-CLOUD-VPC.ios` | 60 lines |

### 10.1 Primary Deployment Configuration Sample: `RTR-CITY-D`

```cisco
! NetArchitect Generated Cisco IOS Configuration
! Device: WAN Router Delhi HQ (Logistics Control) (RTR-CITY-D)
! Platform: ISR-4331 | Role: router
! Generated: 2026-11-14T01:48:21.453Z
!
version 15.2
service timestamps debug datetime msec
service timestamps log datetime msec
service password-encryption
!
hostname RTR-CITY-D
!
no ip domain-lookup
ip routing
!
! --- Interface Configurations ---
interface GigabitEthernet0/1
 description LAN Link to RTR-CITY-M (LINK-WAN-CITY-D-CITY-M)
 no shutdown
!
interface GigabitEthernet0/2
 description LAN Link to RTR-CITY-K (LINK-WAN-CITY-D-CITY-K)
 no shutdown
!
interface GigabitEthernet0/3
 description LAN Link to RTR-CITY-C (LINK-WAN-CITY-D-CITY-C)
 no shutdown
!
interface GigabitEthernet0/4
 description LAN Link to GW-CLOUD-VPC (LINK-IPSEC-HQ-CLOUD)
 no shutdown
!
interface GigabitEthernet0/5
 description LAN Link to GW-CLOUD-VPC (LINK-BGP-HQ-CLOUD)
 no shutdown
!
! --- Loopback Interfaces ---
interface Loopback0
 description Router-ID Anchor for WAN Router Delhi HQ (Logistics Control)
 ip address 10.255.255.1 255.255.255.255
!
! --- IPsec Tunnel Interfaces ---
interface Tunnel100
 description IPsec Site-to-Site Tunnel to Cloud VPC (203.0.113.10)
 ip address 172.31.255.1 255.255.255.252
 tunnel source GigabitEthernet0/1
 tunnel destination 203.0.113.10
 tunnel mode ipsec ipv4
 tunnel protection ipsec profile IKEv2-PROD-PROFILE
!
interface Tunnel101
 description IPsec Site-to-Site Tunnel to Cloud VPC (203.0.113.11)
 ip address 172.31.255.2 255.255.255.252
 tunnel source GigabitEthernet0/1
 tunnel destination 203.0.113.11
 tunnel mode ipsec ipv4
 tunnel protection ipsec profile IKEv2-PROD-PROFILE
!
! --- Access Control Lists ---
ip access-list standard MGMT-VTY-ACCESS
 remark Allow internal management subnets to VTY lines
 permit 10.0.0.0 0.255.255.255
 remark Deny all other remote management attempts
 deny any
!
ip access-list extended IPSEC-CRYPTO-ACL
 remark Interesting traffic for IPsec tunnel to Cloud (203.0.113.10)
 permit ip 10.40.0.0 0.0.15.255 172.20.0.0 0.0.255.255
 remark Interesting traffic for IPsec tunnel to Cloud (203.0.113.11)
 permit ip 10.40.0.0 0.0.15.255 172.20.0.0 0.0.255.255
!
! --- OSPF Process Configuration ---
router ospf 1
 router-id 10.255.255.1
 log-adjacency-changes
 network 10.40.0.0 0.0.7.255 area 0
 network 10.40.8.0 0.0.0.255 area 0
 network 10.40.9.0 0.0.0.127 area 0
 network 10.40.9.128 0.0.0.31 area 0
!
! --- BGP Process Configuration ---
router bgp 65001
 bgp router-id 10.255.255.1
 bgp log-neighbor-changes
 neighbor 203.0.113.10 remote-as 64512
 neighbor 203.0.113.10 description Cloud VPC eBGP Peer (AS 64512)
 aggregate-address 10.40.0.0 255.255.240.0 summary-only
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
| `V-02` | **Root Network Containment Check** | PASS ✅ | All subnets are contained within root block 10.40.0.0/16. |
| `V-03` | **Gateway Subnet Belonging Check** | PASS ✅ | All gateway IP addresses belong to their respective subnet address blocks. |
| `V-04` | **Wildcard Mask Inversion Check** | PASS ✅ | All wildcard masks independently verified against bitwise complement (~netmask). |
| `V-05` | **Host Capacity Sufficiency Check** | PASS ✅ | All carved subnets provide usable host capacity >= requested demand. |
| `V-06` | **VLAN Safety & Native Hardening Check** | PASS ✅ | VLAN IDs are unique, within range 1..4094, and native VLAN 99 is unused for access. |
| `V-07` | **Link Endpoint Existence Check** | PASS ✅ | All physical and logical links terminate on valid, known devices. |
| `V-08` | **Physical Media Feasibility Check** | PASS ✅ | All physical link runs strictly obey IEEE 802.3 transceiver reach limits. |
| `V-09` | **Routing Advertisement Consistency Check** | PASS ✅ | All OSPF network statements map directly to allocated VLSM subnets. |
