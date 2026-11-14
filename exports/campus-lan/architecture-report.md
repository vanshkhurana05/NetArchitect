# Architectural Design & Engineering Justification Log: CIC-307 CAMPUS Design Report
**Topology Profile:** `campus-lan` | **Allocated Base CIDR:** `10.20.0.0` | **Autonomous System:** `AS 65001`
**Generated:** 2026-11-14T01:48:19.425Z | **Engine:** NetArchitect CIC-307 Autonomous Evaluator

---
## 1. Executive Summary

- **Recommended Topology:** Three-Tier Collapsed Core Hierarchy
- **Engineering Rationale:** A single-site enterprise campus benefits from a collapsed core combining core and distribution functions for fast RSTP convergence, strict 802.1Q boundary isolation, and simplified zero-touch management across 1,600 active endpoints without unnecessary multi-tier routing overhead.

## 2. Network Profile

| Parameter | Value | Description |
|---|---|---|
| **Profile Identifier** | `campus-lan` | Evaluated network scenario archetype |
| **Ingestion Source** | preset | Source of parameter specification |
| **Base IPv4 Block** | `10.20.0.0` | Root address allocation block |
| **Routing Domain ASN** | `AS 65001` | Autonomous System Number |
| **Facility Count** | 3 buildings | Physical campus structures (Engineering, Library, Admin) |
| **Total Endpoints** | 1,600 drops | Active workstation, lab, and wireless AP connections |

## 3. Architecture Overview

- **Structural Topology Tier:** `collapsed-core`
- **Layer 2 Protocol:** IEEE 802.1w Rapid Spanning Tree Protocol (RSTP / Rapid-PVST)
- **Layer 3 Routing Protocol:** `single-area-ospf`
- **Autonomous System Number:** AS 65001
- **Total Managed Devices:** 8
- **Total Interconnecting Links:** 10

## 4. Device Inventory

### 4.1 Campus Endpoint Sizing & Switch Allocation Model

| Facility / Building | Active Endpoints | +20% Growth Buffer | Required Access Ports | 48-Port Switches Required | Distribution Uplink Medium |
|---|---|---|---|---|---|
| Building A (Engineering) | 620 | 744 drops | 744 ports | 17x switches (Catalyst Stack) | 85m Cat6a (10GBASE-T) |
| Building B (Library) | 580 | 696 drops | 696 ports | 16x switches (Catalyst Stack) | 190m OM4 MMF (10GBASE-SR) |
| Building C (Admin) | 400 | 480 drops | 480 ports | 11x switches (Catalyst Stack) | 380m OM4 MMF (10GBASE-SR) |
| **Total Campus** | **1,600 drops** | **1,920 drops** | **1,920 ports** | **44 switches (3 Stacks)** | **Full Redundant Backbones** |

### 4.2 Managed Device Hierarchy

| Device ID | Hostname | Role | Site / Facility | Port Capacity | PoE Supported |
|---|---|---|---|---|---|
| `CORE-01` | **Campus Core Switch 01** | `core-switch` | SITE-CORE | 24 ports | No |
| `CORE-02` | **Campus Core Switch 02** | `core-switch` | SITE-CORE | 24 ports | No |
| `DIST-BLD-A` | **Distribution Switch Building A (Engineering)** | `distribution-switch` | BLD-A | 24 ports | No |
| `ACC-BLD-A` | **Access Switch BLD-A (Stack of 17x 48-port Catalyst 2960)** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `DIST-BLD-B` | **Distribution Switch Building B (Library)** | `distribution-switch` | BLD-B | 24 ports | No |
| `ACC-BLD-B` | **Access Switch BLD-B (Stack of 16x 48-port Catalyst 2960)** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `DIST-BLD-C` | **Distribution Switch Building C (Admin)** | `distribution-switch` | BLD-C | 24 ports | No |
| `ACC-BLD-C` | **Access Switch BLD-C (Stack of 11x 48-port Catalyst 2960)** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |

## 5. Physical Media Recommendations (Layer 1 Physics)

All physical cable selections are governed strictly by IEEE 802.3 physical layer standards:

### Link 1: `CORE-01` $\rightarrow$ `CORE-02`
- **Calculated Distance:** 5.0 meters
- **Recommended Media:** Cat6a U/FTP or F/UTP
- **Transceiver Module:** RJ-45 Native / SFP-10G-T-S (Copper)
- **Standard:** `10GBASE-T` (10000 Mbps)
- **Engineering Rationale:** Link distance of 5.0m is within the 100-meter electrical channel limit specified by IEEE 802.3an. 10GBASE-T over Cat6a delivers 10 Gbps throughput at 500 MHz bandwidth with superior power efficiency and eliminates costly optical transceivers for intra-facility runs.

### Link 2: `DIST-BLD-A` $\rightarrow$ `CORE-01`
- **Calculated Distance:** 85.0 meters
- **Recommended Media:** Cat6a U/FTP or F/UTP
- **Transceiver Module:** RJ-45 Native / SFP-10G-T-S (Copper)
- **Standard:** `10GBASE-T` (10000 Mbps)
- **Engineering Rationale:** Link distance of 85.0m is within the 100-meter electrical channel limit specified by IEEE 802.3an. 10GBASE-T over Cat6a delivers 10 Gbps throughput at 500 MHz bandwidth with superior power efficiency and eliminates costly optical transceivers for intra-facility runs.

### Link 3: `DIST-BLD-A` $\rightarrow$ `CORE-02`
- **Calculated Distance:** 85.0 meters
- **Recommended Media:** Cat6a U/FTP or F/UTP
- **Transceiver Module:** RJ-45 Native / SFP-10G-T-S (Copper)
- **Standard:** `10GBASE-T` (10000 Mbps)
- **Engineering Rationale:** Link distance of 85.0m is within the 100-meter electrical channel limit specified by IEEE 802.3an. 10GBASE-T over Cat6a delivers 10 Gbps throughput at 500 MHz bandwidth with superior power efficiency and eliminates costly optical transceivers for intra-facility runs.

### Link 4: `ACC-BLD-A` $\rightarrow$ `DIST-BLD-A`
- **Calculated Distance:** 90.0 meters
- **Recommended Media:** Cat6a U/FTP or F/UTP
- **Transceiver Module:** RJ-45 Native / SFP-10G-T-S (Copper)
- **Standard:** `10GBASE-T` (1000 Mbps)
- **Engineering Rationale:** Link distance of 90.0m is within the 100-meter electrical channel limit specified by IEEE 802.3an. 10GBASE-T over Cat6a delivers 10 Gbps throughput at 500 MHz bandwidth with superior power efficiency and eliminates costly optical transceivers for intra-facility runs.

### Link 5: `DIST-BLD-B` $\rightarrow$ `CORE-01`
- **Calculated Distance:** 190.0 meters
- **Recommended Media:** OM4 Multi-Mode Fiber (MMF 50/125µm)
- **Transceiver Module:** SFP-10G-SR (850 nm VCSEL)
- **Standard:** `10GBASE-SR` (10000 Mbps)
- **Engineering Rationale:** Link distance of 190.0m exceeds the 100m copper limit but sits safely within the 400m operating range of OM4 laser-optimized MMF. OM4 provides an effective modal bandwidth of 4700 MHz·km at 850nm VCSEL transmission, avoiding chromatic dispersion while lowering optics cost.

### Link 6: `DIST-BLD-B` $\rightarrow$ `CORE-02`
- **Calculated Distance:** 190.0 meters
- **Recommended Media:** OM4 Multi-Mode Fiber (MMF 50/125µm)
- **Transceiver Module:** SFP-10G-SR (850 nm VCSEL)
- **Standard:** `10GBASE-SR` (10000 Mbps)
- **Engineering Rationale:** Link distance of 190.0m exceeds the 100m copper limit but sits safely within the 400m operating range of OM4 laser-optimized MMF. OM4 provides an effective modal bandwidth of 4700 MHz·km at 850nm VCSEL transmission, avoiding chromatic dispersion while lowering optics cost.

### Link 7: `ACC-BLD-B` $\rightarrow$ `DIST-BLD-B`
- **Calculated Distance:** 90.0 meters
- **Recommended Media:** Cat6a U/FTP or F/UTP
- **Transceiver Module:** RJ-45 Native / SFP-10G-T-S (Copper)
- **Standard:** `10GBASE-T` (1000 Mbps)
- **Engineering Rationale:** Link distance of 90.0m is within the 100-meter electrical channel limit specified by IEEE 802.3an. 10GBASE-T over Cat6a delivers 10 Gbps throughput at 500 MHz bandwidth with superior power efficiency and eliminates costly optical transceivers for intra-facility runs.

### Link 8: `DIST-BLD-C` $\rightarrow$ `CORE-01`
- **Calculated Distance:** 380.0 meters
- **Recommended Media:** OM4 Multi-Mode Fiber (MMF 50/125µm)
- **Transceiver Module:** SFP-10G-SR (850 nm VCSEL)
- **Standard:** `10GBASE-SR` (10000 Mbps)
- **Engineering Rationale:** Link distance of 380.0m exceeds the 100m copper limit but sits safely within the 400m operating range of OM4 laser-optimized MMF. OM4 provides an effective modal bandwidth of 4700 MHz·km at 850nm VCSEL transmission, avoiding chromatic dispersion while lowering optics cost.

### Link 9: `DIST-BLD-C` $\rightarrow$ `CORE-02`
- **Calculated Distance:** 380.0 meters
- **Recommended Media:** OM4 Multi-Mode Fiber (MMF 50/125µm)
- **Transceiver Module:** SFP-10G-SR (850 nm VCSEL)
- **Standard:** `10GBASE-SR` (10000 Mbps)
- **Engineering Rationale:** Link distance of 380.0m exceeds the 100m copper limit but sits safely within the 400m operating range of OM4 laser-optimized MMF. OM4 provides an effective modal bandwidth of 4700 MHz·km at 850nm VCSEL transmission, avoiding chromatic dispersion while lowering optics cost.

### Link 10: `ACC-BLD-C` $\rightarrow$ `DIST-BLD-C`
- **Calculated Distance:** 88.0 meters
- **Recommended Media:** Cat6a U/FTP or F/UTP
- **Transceiver Module:** RJ-45 Native / SFP-10G-T-S (Copper)
- **Standard:** `10GBASE-T` (1000 Mbps)
- **Engineering Rationale:** Link distance of 88.0m is within the 100-meter electrical channel limit specified by IEEE 802.3an. 10GBASE-T over Cat6a delivers 10 Gbps throughput at 500 MHz bandwidth with superior power efficiency and eliminates costly optical transceivers for intra-facility runs.

### 5.1 Physical Media Allocation Summary

| Link ID | Connection | Run Length | Recommended Medium | Ethernet Standard | Bandwidth |
|---|---|---|---|---|---|
| `LINK-CORE-INTERCONNECT` | `CORE-01` $\leftrightarrow$ `CORE-02` | 5 m | **CAT6A** | `10GBASE-T` | 10000 Mbps |
| `LINK-DIST-BLD-A-CORE-01` | `DIST-BLD-A` $\leftrightarrow$ `CORE-01` | 85 m | **CAT6A** | `10GBASE-T` | 10000 Mbps |
| `LINK-DIST-BLD-A-CORE-02` | `DIST-BLD-A` $\leftrightarrow$ `CORE-02` | 85 m | **CAT6A** | `10GBASE-T` | 10000 Mbps |
| `LINK-ACC-BLD-A-DIST-BLD-A` | `ACC-BLD-A` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-DIST-BLD-B-CORE-01` | `DIST-BLD-B` $\leftrightarrow$ `CORE-01` | 190 m | **OM4** | `10GBASE-SR` | 10000 Mbps |
| `LINK-DIST-BLD-B-CORE-02` | `DIST-BLD-B` $\leftrightarrow$ `CORE-02` | 190 m | **OM4** | `10GBASE-SR` | 10000 Mbps |
| `LINK-ACC-BLD-B-DIST-BLD-B` | `ACC-BLD-B` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-DIST-BLD-C-CORE-01` | `DIST-BLD-C` $\leftrightarrow$ `CORE-01` | 380 m | **OM4** | `10GBASE-SR` | 10000 Mbps |
| `LINK-DIST-BLD-C-CORE-02` | `DIST-BLD-C` $\leftrightarrow$ `CORE-02` | 380 m | **OM4** | `10GBASE-SR` | 10000 Mbps |
| `LINK-ACC-BLD-C-DIST-BLD-C` | `ACC-BLD-C` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |

## 6. 802.1Q VLAN Allocation & Trunking Etiquette

| VLAN ID | Name | Department / Purpose | Mapped Subnet Name |
|---|---|---|---|
| **VLAN 10** | `MGMT` | MANAGEMENT | `MGMT-NET` |
| **VLAN 20** | `STAFF` | STAFF | `STAFF-NET` |
| **VLAN 30** | `STUDENTS` | STUDENTS | `STUDENTS-NET` |
| **VLAN 40** | `SERVERS` | SERVERS | `SERVERS-NET` |
| **VLAN 50** | `PRINTERS` | IOT | `PRINTERS-NET` |

- **Hardened Native VLAN:** `VLAN 99` (configured as untagged, unused, and carrying zero client data to prevent VLAN hopping).
- **Default VLAN 1 Policy:** Disabled for user access; pruned from all inter-switch 802.1Q trunk allowed lists to constrain broadcast domains.

## 7. VLSM Address Allocation Plan (Zero-Overlap Invariant)

Subnets allocated dynamically in strict descending order of host requirements to maximize contiguous block efficiency and prevent overlapping boundary fragmentation.

Root Block CIDR: `10.20.0.0` | Overall Allocation Efficiency: **3.3%**

| VLAN | Subnet Name | Needed | Usable | Prefix | Network Address | Subnet Mask | Cisco Wildcard | Default Gateway | Broadcast Address |
|---|---|---|---|---|---|---|---|---|---|
| VLAN 20 | `STAFF-NET` | 650 | 1022 | /22 | `10.20.0.0` | `255.255.252.0` | `0.0.3.255` | `10.20.0.1` | `10.20.3.255` |
| VLAN 30 | `STUDENTS-NET` | 850 | 1022 | /22 | `10.20.4.0` | `255.255.252.0` | `0.0.3.255` | `10.20.4.1` | `10.20.7.255` |
| VLAN 40 | `SERVERS-NET` | 60 | 62 | /26 | `10.20.8.0` | `255.255.255.192` | `0.0.0.63` | `10.20.8.1` | `10.20.8.63` |
| VLAN 10 | `MGMT-NET` | 20 | 30 | /27 | `10.20.8.64` | `255.255.255.224` | `0.0.0.31` | `10.20.8.65` | `10.20.8.95` |
| VLAN 50 | `PRINTERS-NET` | 20 | 30 | /27 | `10.20.8.96` | `255.255.255.224` | `0.0.0.31` | `10.20.8.97` | `10.20.8.127` |

## 8. Layer 3 Routing Decisions

- **Primary Routing Protocol:** Single-Area OSPFv2 (RFC 2328)
- **Backbone Topology Tier:** Three-Tier Collapsed Core Hierarchy
- **Area Assignment:** Area 0 (Backbone)
- **Border Interconnect:** None (Self-Contained Autonomous System)
- **Protocol Rationale:** Topology scale (5 subnets within a single autonomous campus) does not justify the Link-State Database (LSDB) SPF computational overhead of ABR summarization boundaries. Single-Area OSPF Area 0 guarantees microsecond Dijkstra convergence, simplifies zero-touch adjacencies, and complies with RFC 2328 campus best practices.

## 9. Explainable Engineering Justifications

This section records the exact algorithmic and mathematical rationales behind every choice made. No LLM generation is utilized.

| Decision ID | Module | Rule ID | Selected Recommendation | Technical Rationale | References |
|---|---|---|---|---|---|
| `TOPO.CAMPUS-COLLAPSED-CORE` | TOPOLOGY | `TOPO.01` | **Deployed 2 redundant L3 Core switches in collapsed-core topology** | Collapsed-core topology combines core and distribution functions for campuses < 5,000 endpoints, providing high availability with lower operational complexity. | Cisco Campus LAN Design Guide, IEEE 802.1D RSTP |
| `TOPO.BUILDING-PLAN.BLD-A` | TOPOLOGY | `TOPO.02` | **Sized 17 access switches for BLD-A (represented as ACC-BLD-A Stack for deployment)** | Building Building A (Engineering) (BLD-A): 620 endpoints with 20% growth buffer require 744 active drops. Using 48-port switches with 4 reserved uplink ports yields 44 usable access ports per switch. Allocated 17 access switch(es) providing 748 total access ports (4 spare ports). Calculated 26 PoE+ wireless access points (24 endpoints per AP). Allocated 1 distribution switch/stack for building aggregation. Aggregated into a representative Catalyst Stack for streamlined Packet Tracer / GNS3 verification. | IEEE 802.3at PoE+, ANSI/TIA-568.0-D, Cisco Catalyst StackWise Architecture |
| `TOPO.BUILDING-PLAN.BLD-B` | TOPOLOGY | `TOPO.02` | **Sized 16 access switches for BLD-B (represented as ACC-BLD-B Stack for deployment)** | Building Building B (Library) (BLD-B): 580 endpoints with 20% growth buffer require 696 active drops. Using 48-port switches with 4 reserved uplink ports yields 44 usable access ports per switch. Allocated 16 access switch(es) providing 704 total access ports (8 spare ports). Calculated 25 PoE+ wireless access points (24 endpoints per AP). Allocated 1 distribution switch/stack for building aggregation. Aggregated into a representative Catalyst Stack for streamlined Packet Tracer / GNS3 verification. | IEEE 802.3at PoE+, ANSI/TIA-568.0-D, Cisco Catalyst StackWise Architecture |
| `TOPO.BUILDING-PLAN.BLD-C` | TOPOLOGY | `TOPO.02` | **Sized 11 access switches for BLD-C (represented as ACC-BLD-C Stack for deployment)** | Building Building C (Admin) (BLD-C): 400 endpoints with 20% growth buffer require 480 active drops. Using 48-port switches with 4 reserved uplink ports yields 44 usable access ports per switch. Allocated 11 access switch(es) providing 484 total access ports (4 spare ports). Calculated 17 PoE+ wireless access points (24 endpoints per AP). Allocated 1 distribution switch/stack for building aggregation. Aggregated into a representative Catalyst Stack for streamlined Packet Tracer / GNS3 verification. | IEEE 802.3at PoE+, ANSI/TIA-568.0-D, Cisco Catalyst StackWise Architecture |
| `VLAN.DETERMINISTIC-TAGS` | VLAN | `VLAN.01` | **Assigned deterministic 802.1Q tags starting at 10 (+10)** | Standardized VLAN numbering ensures uniform broadcast domain mapping across campus switches and prevents conflicting PVIDs. | IEEE 802.1Q, Cisco Campus LAN Best Practices |
| `VLAN.NATIVE-HARDENING` | VLAN | `VLAN.02` | **Configured Native VLAN 99 as untagged and unused on all trunks** | Setting the native VLAN to an unused ID (VLAN 99) and disallowing default VLAN 1 mitigates 802.1Q double-tagging and VLAN hopping security vulnerabilities. | NIST SP 800-115, DISA Network Infrastructure STIG |
| `VLAN.TRUNK-PRUNING` | VLAN | `VLAN.03` | **Restricted trunk links to explicitly allowed VLAN list [10,20,30,40,50]** | Explicit allowed-VLAN pruning confines broadcast/multicast traffic strictly to authorized switches, conserving backplane bandwidth. | IEEE 802.1Q Clause 9, RFC 3069 |
| `VLSM.ALLOC-0-STAFF-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated STAFF-NET as 10.20.0.0/22** | 650 requested hosts map to the minimal /22 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.0.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-1-STUDENTS-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated STUDENTS-NET as 10.20.4.0/22** | 850 requested hosts map to the minimal /22 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.4.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-2-SERVERS-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated SERVERS-NET as 10.20.8.0/26** | 60 requested hosts map to the minimal /26 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.8.1 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-3-MGMT-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated MGMT-NET as 10.20.8.64/27** | 20 requested hosts map to the minimal /27 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.8.65 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.ALLOC-4-PRINTERS-NET` | VLSM | `VLSM.DESCENDING-CARVE` | **Allocated PRINTERS-NET as 10.20.8.96/27** | 20 requested hosts map to the minimal /27 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.8.97 (first usable IP). | RFC 950, RFC 3021 |
| `VLSM.UTILIZATION` | VLSM | `VLSM.CAPACITY` | **Root-block utilization 3.31%** | (2166 usable addresses of 65534 in 10.20.0.0/16, 5 blocks carved, 63360 address(es) left free. | RFC 950 |
| `VLSM.NO-OVERLAP` | VLSM | `VLSM.INVARIANT` | **No-overlap invariant holds across all allocations.** | Monotone carving guarantees non-intersection; verified with an O(n) boundary assertion. | RFC 950 |
| `ROUTING.PROTOCOL.SINGLE-AREA-OSPF` | ROUTING | `ROUTING.01` | **Selected Single-Area OSPF (Area 0) for Campus LAN** | Campus LAN operates within a single autonomous system with 5 subnets (less than the 50-subnet threshold). OSPF Area 0 provides fast link-state SPF convergence without multi-area ABR summarization complexity. | RFC 2328 OSPFv2 Section 3.1, Cisco Campus Network Design Guide |
| `ROUTING.OSPF.AREAS` | ROUTING | `ROUTING.04` | **Configured 1 OSPF area(s) with 5 network statements** | Network statements map exact network-aligned CIDRs and inverse wildcard masks directly from the VLSM plan, ensuring flawless LSDB population. | RFC 2328 Section 3.1, RFC 1878 |

## 10. Configuration Artifact Inventory

| Device ID | Hostname | Generated Configuration File | Lines of IOS Code |
|---|---|---|---|
| `CORE-01` | **Campus Core Switch 01** | `exports/campus/CORE-01.ios` | 127 lines |
| `CORE-02` | **Campus Core Switch 02** | `exports/campus/CORE-02.ios` | 127 lines |
| `DIST-BLD-A` | **Distribution Switch Building A (Engineering)** | `exports/campus/DIST-BLD-A.ios` | 92 lines |
| `ACC-BLD-A` | **Access Switch BLD-A (Stack of 17x 48-port Catalyst 2960)** | `exports/campus/ACC-BLD-A.ios` | 127 lines |
| `DIST-BLD-B` | **Distribution Switch Building B (Library)** | `exports/campus/DIST-BLD-B.ios` | 92 lines |
| `ACC-BLD-B` | **Access Switch BLD-B (Stack of 16x 48-port Catalyst 2960)** | `exports/campus/ACC-BLD-B.ios` | 127 lines |
| `DIST-BLD-C` | **Distribution Switch Building C (Admin)** | `exports/campus/DIST-BLD-C.ios` | 92 lines |
| `ACC-BLD-C` | **Access Switch BLD-C (Stack of 11x 48-port Catalyst 2960)** | `exports/campus/ACC-BLD-C.ios` | 127 lines |

### 10.1 Primary Deployment Configuration Sample: `CORE-01`

```cisco
! NetArchitect Generated Cisco IOS Configuration
! Device: Campus Core Switch 01 (CORE-01)
! Platform: Catalyst-3560 | Role: core-switch
! Generated: 2026-11-14T01:48:19.421Z
!
version 15.2
service timestamps debug datetime msec
service timestamps log datetime msec
service password-encryption
!
hostname CORE-01
!
no ip domain-lookup
ip routing
!
! --- Spanning Tree Architecture (RSTP) ---
spanning-tree mode rapid-pvst
spanning-tree vlan 1-4094 priority 4096
!
! --- 802.1Q VLAN Database ---
vlan 10
 name MGMT
vlan 20
 name STAFF
vlan 30
 name STUDENTS
vlan 40
 name SERVERS
vlan 50
 name PRINTERS
!
! --- Interface Configurations ---
interface TenGigabitEthernet1/0/1
 description Trunk link to CORE-02 (LINK-CORE-INTERCONNECT)
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,40,50
 switchport trunk native vlan 99
 no shutdown
!
interface TenGigabitEthernet1/0/2
 description Trunk link to DIST-BLD-A (LINK-DIST-BLD-A-CORE-01)
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,40,50
 switchport trunk native vlan 99
 no shutdown
!
interface TenGigabitEthernet1/0/3
 description Trunk link to DIST-BLD-B (LINK-DIST-BLD-B-CORE-01)
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,40,50
 switchport trunk native vlan 99
 no shutdown
!
interface TenGigabitEthernet1/0/4
 description Trunk link to DIST-BLD-C (LINK-DIST-BLD-C-CORE-01)
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,40,50
 switchport trunk native vlan 99
 no shutdown
!
! --- Switch Virtual Interfaces (SVIs) ---
interface Vlan10
 description SVI Gateway for MGMT
 ip address 10.20.8.65 255.255.255.224
 no shutdown
!
interface Vlan20
 description SVI Gateway for STAFF
 ip address 10.20.0.1 255.255.252.0
 no shutdown
!
interface Vlan30
 description SVI Gateway for STUDENTS
 ip address 10.20.4.1 255.255.252.0
 no shutdown
!
interface Vlan40
 description SVI Gateway for SERVERS
 ip address 10.20.8.1 255.255.255.192
 no shutdown
!
interface Vlan50
 description SVI Gateway for PRINTERS
 ip address 10.20.8.97 255.255.255.224
 no shutdown
!
! --- Loopback Interfaces ---
interface Loopback0
 description Router-ID Anchor for Campus Core Switch 01
 ip address 10.255.255.1 255.255.255.255
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
 network 10.20.0.0 0.0.3.255 area 0
 network 10.20.4.0 0.0.3.255 area 0
 network 10.20.8.0 0.0.0.63 area 0
 network 10.20.8.64 0.0.0.31 area 0
 network 10.20.8.96 0.0.0.31 area 0
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
| `V-02` | **Root Network Containment Check** | PASS ✅ | All subnets are contained within root block 10.20.0.0/16. |
| `V-03` | **Gateway Subnet Belonging Check** | PASS ✅ | All gateway IP addresses belong to their respective subnet address blocks. |
| `V-04` | **Wildcard Mask Inversion Check** | PASS ✅ | All wildcard masks independently verified against bitwise complement (~netmask). |
| `V-05` | **Host Capacity Sufficiency Check** | PASS ✅ | All carved subnets provide usable host capacity >= requested demand. |
| `V-06` | **VLAN Safety & Native Hardening Check** | PASS ✅ | VLAN IDs are unique, within range 1..4094, and native VLAN 99 is unused for access. |
| `V-07` | **Link Endpoint Existence Check** | PASS ✅ | All physical and logical links terminate on valid, known devices. |
| `V-08` | **Physical Media Feasibility Check** | PASS ✅ | All physical link runs strictly obey IEEE 802.3 transceiver reach limits. |
| `V-09` | **Routing Advertisement Consistency Check** | PASS ✅ | All OSPF network statements map directly to allocated VLSM subnets. |
