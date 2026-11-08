# NetArchitect Design Report — CAMPUS Design Report
**Generated:** 2026-11-07T23:47:23.978Z | **Profile:** `campus-lan` | **Source:** PRESET

---
## 1. Executive Summary

This document details the complete Layer 1–3 network architecture recommendation and deployment-ready Cisco IOS configurations for an enterprise **Campus LAN** environment comprising 3 primary facilities (Engineering, Library, Administration) and 1,600 active endpoints. The design implements a resilient collapsed-core hierarchy with dual Catalyst 3560/3650 switches, 10G OM4 MMF backbones, 802.1Q VLAN isolation, RSTP loop prevention, and Single-Area OSPF fast convergence.

## 2. Network Profile

| Parameter | Value | Description |
|---|---|---|
| **Profile Identifier** | `campus-lan` | Evaluated network scenario archetype |
| **Ingestion Source** | preset | Source of parameter specification |
| **Facility Count** | 3 buildings | Physical campus structures |
| **Total Endpoints** | 1,600 drops | Active workstation, lab, and wireless AP connections |

## 3. Architecture Overview

- **Structural Topology Tier:** `collapsed-core`
- **Layer 2 Protocol:** IEEE 802.1w Rapid Spanning Tree Protocol (RSTP / Rapid-PVST)
- **Layer 3 Routing Protocol:** `single-area-ospf`
- **Autonomous System Number:** AS 65001
- **Total Managed Devices:** 49
- **Total Interconnecting Links:** 51

## 4. Device Inventory

| Device ID | Hostname | Role | Site / Facility | Port Capacity | PoE Supported |
|---|---|---|---|---|---|
| `CORE-01` | **Campus Core Switch 01** | `core-switch` | SITE-CORE | 24 ports | No |
| `CORE-02` | **Campus Core Switch 02** | `core-switch` | SITE-CORE | 24 ports | No |
| `DIST-BLD-A` | **Distribution Switch Building A (Engineering)** | `distribution-switch` | BLD-A | 24 ports | No |
| `ACC-BLD-A-SW1` | **Access Switch BLD-A #1** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW2` | **Access Switch BLD-A #2** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW3` | **Access Switch BLD-A #3** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW4` | **Access Switch BLD-A #4** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW5` | **Access Switch BLD-A #5** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW6` | **Access Switch BLD-A #6** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW7` | **Access Switch BLD-A #7** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW8` | **Access Switch BLD-A #8** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW9` | **Access Switch BLD-A #9** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW10` | **Access Switch BLD-A #10** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW11` | **Access Switch BLD-A #11** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW12` | **Access Switch BLD-A #12** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW13` | **Access Switch BLD-A #13** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW14` | **Access Switch BLD-A #14** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW15` | **Access Switch BLD-A #15** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW16` | **Access Switch BLD-A #16** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-A-SW17` | **Access Switch BLD-A #17** | `access-switch` | BLD-A | 48 ports | Yes (802.3at PoE+) |
| `DIST-BLD-B` | **Distribution Switch Building B (Library)** | `distribution-switch` | BLD-B | 24 ports | No |
| `ACC-BLD-B-SW1` | **Access Switch BLD-B #1** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW2` | **Access Switch BLD-B #2** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW3` | **Access Switch BLD-B #3** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW4` | **Access Switch BLD-B #4** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW5` | **Access Switch BLD-B #5** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW6` | **Access Switch BLD-B #6** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW7` | **Access Switch BLD-B #7** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW8` | **Access Switch BLD-B #8** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW9` | **Access Switch BLD-B #9** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW10` | **Access Switch BLD-B #10** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW11` | **Access Switch BLD-B #11** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW12` | **Access Switch BLD-B #12** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW13` | **Access Switch BLD-B #13** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW14` | **Access Switch BLD-B #14** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW15` | **Access Switch BLD-B #15** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-B-SW16` | **Access Switch BLD-B #16** | `access-switch` | BLD-B | 48 ports | Yes (802.3at PoE+) |
| `DIST-BLD-C` | **Distribution Switch Building C (Admin)** | `distribution-switch` | BLD-C | 24 ports | No |
| `ACC-BLD-C-SW1` | **Access Switch BLD-C #1** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW2` | **Access Switch BLD-C #2** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW3` | **Access Switch BLD-C #3** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW4` | **Access Switch BLD-C #4** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW5` | **Access Switch BLD-C #5** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW6` | **Access Switch BLD-C #6** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW7` | **Access Switch BLD-C #7** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW8` | **Access Switch BLD-C #8** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW9` | **Access Switch BLD-C #9** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW10` | **Access Switch BLD-C #10** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |
| `ACC-BLD-C-SW11` | **Access Switch BLD-C #11** | `access-switch` | BLD-C | 48 ports | Yes (802.3at PoE+) |

## 5. Physical Media Recommendations (Layer 1 Physics)

All physical cable selections are governed strictly by IEEE 802.3 physical layer standards:

| Link ID | Connection | Run Length | Recommended Medium | Ethernet Standard | Bandwidth |
|---|---|---|---|---|---|
| `LINK-CORE-INTERCONNECT` | `CORE-01` $\leftrightarrow$ `CORE-02` | 5 m | **CAT6A** | `10GBASE-T` | 10000 Mbps |
| `LINK-DIST-BLD-A-CORE-01` | `DIST-BLD-A` $\leftrightarrow$ `CORE-01` | 85 m | **CAT6A** | `10GBASE-T` | 10000 Mbps |
| `LINK-DIST-BLD-A-CORE-02` | `DIST-BLD-A` $\leftrightarrow$ `CORE-02` | 85 m | **CAT6A** | `10GBASE-T` | 10000 Mbps |
| `LINK-ACC-BLD-A-SW1-DIST-BLD-A` | `ACC-BLD-A-SW1` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW2-DIST-BLD-A` | `ACC-BLD-A-SW2` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW3-DIST-BLD-A` | `ACC-BLD-A-SW3` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW4-DIST-BLD-A` | `ACC-BLD-A-SW4` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW5-DIST-BLD-A` | `ACC-BLD-A-SW5` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW6-DIST-BLD-A` | `ACC-BLD-A-SW6` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW7-DIST-BLD-A` | `ACC-BLD-A-SW7` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW8-DIST-BLD-A` | `ACC-BLD-A-SW8` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW9-DIST-BLD-A` | `ACC-BLD-A-SW9` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW10-DIST-BLD-A` | `ACC-BLD-A-SW10` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW11-DIST-BLD-A` | `ACC-BLD-A-SW11` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW12-DIST-BLD-A` | `ACC-BLD-A-SW12` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW13-DIST-BLD-A` | `ACC-BLD-A-SW13` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW14-DIST-BLD-A` | `ACC-BLD-A-SW14` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW15-DIST-BLD-A` | `ACC-BLD-A-SW15` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW16-DIST-BLD-A` | `ACC-BLD-A-SW16` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-A-SW17-DIST-BLD-A` | `ACC-BLD-A-SW17` $\leftrightarrow$ `DIST-BLD-A` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-DIST-BLD-B-CORE-01` | `DIST-BLD-B` $\leftrightarrow$ `CORE-01` | 190 m | **OM4** | `10GBASE-SR` | 10000 Mbps |
| `LINK-DIST-BLD-B-CORE-02` | `DIST-BLD-B` $\leftrightarrow$ `CORE-02` | 190 m | **OM4** | `10GBASE-SR` | 10000 Mbps |
| `LINK-ACC-BLD-B-SW1-DIST-BLD-B` | `ACC-BLD-B-SW1` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW2-DIST-BLD-B` | `ACC-BLD-B-SW2` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW3-DIST-BLD-B` | `ACC-BLD-B-SW3` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW4-DIST-BLD-B` | `ACC-BLD-B-SW4` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW5-DIST-BLD-B` | `ACC-BLD-B-SW5` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW6-DIST-BLD-B` | `ACC-BLD-B-SW6` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW7-DIST-BLD-B` | `ACC-BLD-B-SW7` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW8-DIST-BLD-B` | `ACC-BLD-B-SW8` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW9-DIST-BLD-B` | `ACC-BLD-B-SW9` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW10-DIST-BLD-B` | `ACC-BLD-B-SW10` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW11-DIST-BLD-B` | `ACC-BLD-B-SW11` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW12-DIST-BLD-B` | `ACC-BLD-B-SW12` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW13-DIST-BLD-B` | `ACC-BLD-B-SW13` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW14-DIST-BLD-B` | `ACC-BLD-B-SW14` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW15-DIST-BLD-B` | `ACC-BLD-B-SW15` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-B-SW16-DIST-BLD-B` | `ACC-BLD-B-SW16` $\leftrightarrow$ `DIST-BLD-B` | 90 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-DIST-BLD-C-CORE-01` | `DIST-BLD-C` $\leftrightarrow$ `CORE-01` | 380 m | **OM4** | `10GBASE-SR` | 10000 Mbps |
| `LINK-DIST-BLD-C-CORE-02` | `DIST-BLD-C` $\leftrightarrow$ `CORE-02` | 380 m | **OM4** | `10GBASE-SR` | 10000 Mbps |
| `LINK-ACC-BLD-C-SW1-DIST-BLD-C` | `ACC-BLD-C-SW1` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW2-DIST-BLD-C` | `ACC-BLD-C-SW2` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW3-DIST-BLD-C` | `ACC-BLD-C-SW3` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW4-DIST-BLD-C` | `ACC-BLD-C-SW4` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW5-DIST-BLD-C` | `ACC-BLD-C-SW5` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW6-DIST-BLD-C` | `ACC-BLD-C-SW6` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW7-DIST-BLD-C` | `ACC-BLD-C-SW7` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW8-DIST-BLD-C` | `ACC-BLD-C-SW8` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW9-DIST-BLD-C` | `ACC-BLD-C-SW9` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW10-DIST-BLD-C` | `ACC-BLD-C-SW10` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |
| `LINK-ACC-BLD-C-SW11-DIST-BLD-C` | `ACC-BLD-C-SW11` $\leftrightarrow$ `DIST-BLD-C` | 88 m | **CAT6A** | `10GBASE-T` | 1000 Mbps |

## 6. 802.1Q VLAN Allocation & Trunking Etiquette

| VLAN ID | Name | Department / Purpose | Mapped Subnet Name |
|---|---|---|---|
| **VLAN 10** | `MGMT` | MANAGEMENT | `MGMT-NET` |
| **VLAN 20** | `STAFF` | STAFF | `STAFF-NET` |
| **VLAN 30** | `STUDENTS` | STUDENTS | `STUDENTS-NET` |
| **VLAN 40** | `SERVERS` | SERVERS | `SERVERS-NET` |
| **VLAN 50** | `PRINTERS` | IOT | `PRINTERS-NET` |

- **Hardened Native VLAN:** `VLAN 99` (configured as untagged, unused, and carrying zero client data).
- **Default VLAN 1 Policy:** Disabled for user access; pruned from all inter-switch 802.1Q trunk allowed lists.

## 7. VLSM Address Allocation Plan (Zero-Overlap Invariant)

Root Block CIDR: `10.20.0.0` | Overall Allocation Efficiency: **3.3%**

| Subnet Name | Network Address | Prefix | Subnet Mask | Wildcard Mask | Gateway IP | Usable Host Range | Hosts (Req/Cap) |
|---|---|---|---|---|---|---|---|
| `STAFF-NET` | `10.20.0.0` | /22 | `255.255.252.0` | `0.0.3.255` | `10.20.0.1` | `10.20.0.1` – `10.20.3.254` | 650 / 1022 |
| `STUDENTS-NET` | `10.20.4.0` | /22 | `255.255.252.0` | `0.0.3.255` | `10.20.4.1` | `10.20.4.1` – `10.20.7.254` | 850 / 1022 |
| `SERVERS-NET` | `10.20.8.0` | /26 | `255.255.255.192` | `0.0.0.63` | `10.20.8.1` | `10.20.8.1` – `10.20.8.62` | 60 / 62 |
| `MGMT-NET` | `10.20.8.64` | /27 | `255.255.255.224` | `0.0.0.31` | `10.20.8.65` | `10.20.8.65` – `10.20.8.94` | 20 / 30 |
| `PRINTERS-NET` | `10.20.8.96` | /27 | `255.255.255.224` | `0.0.0.31` | `10.20.8.97` | `10.20.8.97` – `10.20.8.126` | 20 / 30 |

## 8. Layer 3 Routing Decisions

- **Selected Routing Protocol:** `single-area-ospf`
- **Autonomous System (ASN):** `AS 65001`
- **OSPF Areas Planned:** 1 area(s)
  - **Area 0 (Backbone Area 0):** 5 network statements, sites: [SITE-CORE, BLD-A, BLD-B, BLD-C]

## 9. Explainable Engineering Justifications

This section records the exact algorithmic and mathematical rationales behind every choice made. No LLM generation is utilized.

| Decision ID | Module | Rule ID | Selected Recommendation | Technical Rationale | References |
|---|---|---|---|---|---|
| `TOPO.CAMPUS-COLLAPSED-CORE` | TOPOLOGY | `TOPO.01` | **Deployed 2 redundant L3 Core switches in collapsed-core topology** | Collapsed-core topology combines core and distribution functions for campuses < 5,000 endpoints, providing high availability with lower operational complexity. | Cisco Campus LAN Design Guide, IEEE 802.1D RSTP |
| `TOPO.BUILDING-PLAN.BLD-A` | TOPOLOGY | `TOPO.02` | **Sized 17 access switches and 1 distribution switch for BLD-A** | Building Building A (Engineering) (BLD-A): 620 endpoints with 20% growth buffer require 744 active drops. Using 48-port switches with 4 reserved uplink ports yields 44 usable access ports per switch. Allocated 17 access switch(es) providing 748 total access ports (4 spare ports). Calculated 26 PoE+ wireless access points (24 endpoints per AP). Allocated 1 distribution switch/stack for building aggregation. | IEEE 802.3at PoE+, ANSI/TIA-568.0-D |
| `TOPO.BUILDING-PLAN.BLD-B` | TOPOLOGY | `TOPO.02` | **Sized 16 access switches and 1 distribution switch for BLD-B** | Building Building B (Library) (BLD-B): 580 endpoints with 20% growth buffer require 696 active drops. Using 48-port switches with 4 reserved uplink ports yields 44 usable access ports per switch. Allocated 16 access switch(es) providing 704 total access ports (8 spare ports). Calculated 25 PoE+ wireless access points (24 endpoints per AP). Allocated 1 distribution switch/stack for building aggregation. | IEEE 802.3at PoE+, ANSI/TIA-568.0-D |
| `TOPO.BUILDING-PLAN.BLD-C` | TOPOLOGY | `TOPO.02` | **Sized 11 access switches and 1 distribution switch for BLD-C** | Building Building C (Admin) (BLD-C): 400 endpoints with 20% growth buffer require 480 active drops. Using 48-port switches with 4 reserved uplink ports yields 44 usable access ports per switch. Allocated 11 access switch(es) providing 484 total access ports (4 spare ports). Calculated 17 PoE+ wireless access points (24 endpoints per AP). Allocated 1 distribution switch/stack for building aggregation. | IEEE 802.3at PoE+, ANSI/TIA-568.0-D |
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

#### Domain: TOPOLOGY

##### [TOPO.01] Deployed 2 redundant L3 Core switches in collapsed-core topology
- **Decision ID:** `TOPO.CAMPUS-COLLAPSED-CORE`
- **Governing Rule:** `TOPO.01`
- **Technical Rationale:**
  - Collapsed-core topology combines core and distribution functions for campuses < 5,000 endpoints, providing high availability with lower operational complexity.
- **Governing Inputs:** `{"buildingsCount":3,"coreSwitches":2}`
- **Normative References:** Cisco Campus LAN Design Guide, IEEE 802.1D RSTP

##### [TOPO.02] Sized 17 access switches and 1 distribution switch for BLD-A
- **Decision ID:** `TOPO.BUILDING-PLAN.BLD-A`
- **Governing Rule:** `TOPO.02`
- **Technical Rationale:**
  - Building Building A (Engineering) (BLD-A): 620 endpoints with 20% growth buffer require 744 active drops. Using 48-port switches with 4 reserved uplink ports yields 44 usable access ports per switch. Allocated 17 access switch(es) providing 748 total access ports (4 spare ports). Calculated 26 PoE+ wireless access points (24 endpoints per AP). Allocated 1 distribution switch/stack for building aggregation.
- **Governing Inputs:** `{"endpoints":620,"accessSwitches":17,"apCount":26}`
- **Normative References:** IEEE 802.3at PoE+, ANSI/TIA-568.0-D

##### [TOPO.02] Sized 16 access switches and 1 distribution switch for BLD-B
- **Decision ID:** `TOPO.BUILDING-PLAN.BLD-B`
- **Governing Rule:** `TOPO.02`
- **Technical Rationale:**
  - Building Building B (Library) (BLD-B): 580 endpoints with 20% growth buffer require 696 active drops. Using 48-port switches with 4 reserved uplink ports yields 44 usable access ports per switch. Allocated 16 access switch(es) providing 704 total access ports (8 spare ports). Calculated 25 PoE+ wireless access points (24 endpoints per AP). Allocated 1 distribution switch/stack for building aggregation.
- **Governing Inputs:** `{"endpoints":580,"accessSwitches":16,"apCount":25}`
- **Normative References:** IEEE 802.3at PoE+, ANSI/TIA-568.0-D

##### [TOPO.02] Sized 11 access switches and 1 distribution switch for BLD-C
- **Decision ID:** `TOPO.BUILDING-PLAN.BLD-C`
- **Governing Rule:** `TOPO.02`
- **Technical Rationale:**
  - Building Building C (Admin) (BLD-C): 400 endpoints with 20% growth buffer require 480 active drops. Using 48-port switches with 4 reserved uplink ports yields 44 usable access ports per switch. Allocated 11 access switch(es) providing 484 total access ports (4 spare ports). Calculated 17 PoE+ wireless access points (24 endpoints per AP). Allocated 1 distribution switch/stack for building aggregation.
- **Governing Inputs:** `{"endpoints":400,"accessSwitches":11,"apCount":17}`
- **Normative References:** IEEE 802.3at PoE+, ANSI/TIA-568.0-D

#### Domain: VLAN

##### [VLAN.01] Assigned deterministic 802.1Q tags starting at 10 (+10)
- **Decision ID:** `VLAN.DETERMINISTIC-TAGS`
- **Governing Rule:** `VLAN.01`
- **Technical Rationale:**
  - Standardized VLAN numbering ensures uniform broadcast domain mapping across campus switches and prevents conflicting PVIDs.
- **Governing Inputs:** `{"totalVlans":5,"startId":10,"increment":10}`
- **Normative References:** IEEE 802.1Q, Cisco Campus LAN Best Practices

##### [VLAN.02] Configured Native VLAN 99 as untagged and unused on all trunks
- **Decision ID:** `VLAN.NATIVE-HARDENING`
- **Governing Rule:** `VLAN.02`
- **Technical Rationale:**
  - Setting the native VLAN to an unused ID (VLAN 99) and disallowing default VLAN 1 mitigates 802.1Q double-tagging and VLAN hopping security vulnerabilities.
- **Governing Inputs:** `{"nativeVlanId":99,"defaultVlanDisabled":1}`
- **Normative References:** NIST SP 800-115, DISA Network Infrastructure STIG

##### [VLAN.03] Restricted trunk links to explicitly allowed VLAN list [10,20,30,40,50]
- **Decision ID:** `VLAN.TRUNK-PRUNING`
- **Governing Rule:** `VLAN.03`
- **Technical Rationale:**
  - Explicit allowed-VLAN pruning confines broadcast/multicast traffic strictly to authorized switches, conserving backplane bandwidth.
- **Governing Inputs:** `{"allowedVlanIds":[10,20,30,40,50]}`
- **Normative References:** IEEE 802.1Q Clause 9, RFC 3069

#### Domain: VLSM

##### [VLSM.DESCENDING-CARVE] Allocated STAFF-NET as 10.20.0.0/22
- **Decision ID:** `VLSM.ALLOC-0-STAFF-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 650 requested hosts map to the minimal /22 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.0.1 (first usable IP).
- **Governing Inputs:** `{"hosts":650,"inputIndex":1,"prefix":22}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.DESCENDING-CARVE] Allocated STUDENTS-NET as 10.20.4.0/22
- **Decision ID:** `VLSM.ALLOC-1-STUDENTS-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 850 requested hosts map to the minimal /22 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.4.1 (first usable IP).
- **Governing Inputs:** `{"hosts":850,"inputIndex":2,"prefix":22}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.DESCENDING-CARVE] Allocated SERVERS-NET as 10.20.8.0/26
- **Decision ID:** `VLSM.ALLOC-2-SERVERS-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 60 requested hosts map to the minimal /26 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.8.1 (first usable IP).
- **Governing Inputs:** `{"hosts":60,"inputIndex":3,"prefix":26}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.DESCENDING-CARVE] Allocated MGMT-NET as 10.20.8.64/27
- **Decision ID:** `VLSM.ALLOC-3-MGMT-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 20 requested hosts map to the minimal /27 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.8.65 (first usable IP).
- **Governing Inputs:** `{"hosts":20,"inputIndex":0,"prefix":27}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.DESCENDING-CARVE] Allocated PRINTERS-NET as 10.20.8.96/27
- **Decision ID:** `VLSM.ALLOC-4-PRINTERS-NET`
- **Governing Rule:** `VLSM.DESCENDING-CARVE`
- **Technical Rationale:**
  - 20 requested hosts map to the minimal /27 under RFC 3021 host-capacity math; carved monotonically after all larger blocks, gateway reserved at 10.20.8.97 (first usable IP).
- **Governing Inputs:** `{"hosts":20,"inputIndex":4,"prefix":27}`
- **Normative References:** RFC 950, RFC 3021

##### [VLSM.CAPACITY] Root-block utilization 3.31%
- **Decision ID:** `VLSM.UTILIZATION`
- **Governing Rule:** `VLSM.CAPACITY`
- **Technical Rationale:**
  - (2166 usable addresses of 65534 in 10.20.0.0/16, 5 blocks carved, 63360 address(es) left free.
- **Governing Inputs:** `{"allocatedCapacity":2166,"rootCapacity":65534}`
- **Normative References:** RFC 950

##### [VLSM.INVARIANT] No-overlap invariant holds across all allocations.
- **Decision ID:** `VLSM.NO-OVERLAP`
- **Governing Rule:** `VLSM.INVARIANT`
- **Technical Rationale:**
  - Monotone carving guarantees non-intersection; verified with an O(n) boundary assertion.
- **Governing Inputs:** `{"count":5}`
- **Normative References:** RFC 950

#### Domain: ROUTING

##### [ROUTING.01] Selected Single-Area OSPF (Area 0) for Campus LAN
- **Decision ID:** `ROUTING.PROTOCOL.SINGLE-AREA-OSPF`
- **Governing Rule:** `ROUTING.01`
- **Technical Rationale:**
  - Campus LAN operates within a single autonomous system with 5 subnets (less than the 50-subnet threshold). OSPF Area 0 provides fast link-state SPF convergence without multi-area ABR summarization complexity.
- **Governing Inputs:** `{"asNumber":65001,"subnetCount":5,"threshold":50}`
- **Normative References:** RFC 2328 OSPFv2 Section 3.1, Cisco Campus Network Design Guide

##### [ROUTING.04] Configured 1 OSPF area(s) with 5 network statements
- **Decision ID:** `ROUTING.OSPF.AREAS`
- **Governing Rule:** `ROUTING.04`
- **Technical Rationale:**
  - Network statements map exact network-aligned CIDRs and inverse wildcard masks directly from the VLSM plan, ensuring flawless LSDB population.
- **Governing Inputs:** `{"areasCount":1,"totalNetworks":5}`
- **Normative References:** RFC 2328 Section 3.1, RFC 1878

## 10. Configuration Artifact Inventory

| Device ID | Hostname | Generated Configuration File | Lines of IOS Code |
|---|---|---|---|
| `CORE-01` | **Campus Core Switch 01** | `exports/campus/CORE-01.ios` | 127 lines |
| `CORE-02` | **Campus Core Switch 02** | `exports/campus/CORE-02.ios` | 127 lines |
| `DIST-BLD-A` | **Distribution Switch Building A (Engineering)** | `exports/campus/DIST-BLD-A.ios` | 220 lines |
| `ACC-BLD-A-SW1` | **Access Switch BLD-A #1** | `exports/campus/ACC-BLD-A-SW1.ios` | 319 lines |
| `ACC-BLD-A-SW2` | **Access Switch BLD-A #2** | `exports/campus/ACC-BLD-A-SW2.ios` | 319 lines |
| `ACC-BLD-A-SW3` | **Access Switch BLD-A #3** | `exports/campus/ACC-BLD-A-SW3.ios` | 319 lines |
| `ACC-BLD-A-SW4` | **Access Switch BLD-A #4** | `exports/campus/ACC-BLD-A-SW4.ios` | 319 lines |
| `ACC-BLD-A-SW5` | **Access Switch BLD-A #5** | `exports/campus/ACC-BLD-A-SW5.ios` | 319 lines |
| `ACC-BLD-A-SW6` | **Access Switch BLD-A #6** | `exports/campus/ACC-BLD-A-SW6.ios` | 319 lines |
| `ACC-BLD-A-SW7` | **Access Switch BLD-A #7** | `exports/campus/ACC-BLD-A-SW7.ios` | 319 lines |
| `ACC-BLD-A-SW8` | **Access Switch BLD-A #8** | `exports/campus/ACC-BLD-A-SW8.ios` | 319 lines |
| `ACC-BLD-A-SW9` | **Access Switch BLD-A #9** | `exports/campus/ACC-BLD-A-SW9.ios` | 319 lines |
| `ACC-BLD-A-SW10` | **Access Switch BLD-A #10** | `exports/campus/ACC-BLD-A-SW10.ios` | 319 lines |
| `ACC-BLD-A-SW11` | **Access Switch BLD-A #11** | `exports/campus/ACC-BLD-A-SW11.ios` | 319 lines |
| `ACC-BLD-A-SW12` | **Access Switch BLD-A #12** | `exports/campus/ACC-BLD-A-SW12.ios` | 319 lines |
| `ACC-BLD-A-SW13` | **Access Switch BLD-A #13** | `exports/campus/ACC-BLD-A-SW13.ios` | 319 lines |
| `ACC-BLD-A-SW14` | **Access Switch BLD-A #14** | `exports/campus/ACC-BLD-A-SW14.ios` | 319 lines |
| `ACC-BLD-A-SW15` | **Access Switch BLD-A #15** | `exports/campus/ACC-BLD-A-SW15.ios` | 319 lines |
| `ACC-BLD-A-SW16` | **Access Switch BLD-A #16** | `exports/campus/ACC-BLD-A-SW16.ios` | 319 lines |
| `ACC-BLD-A-SW17` | **Access Switch BLD-A #17** | `exports/campus/ACC-BLD-A-SW17.ios` | 319 lines |
| `DIST-BLD-B` | **Distribution Switch Building B (Library)** | `exports/campus/DIST-BLD-B.ios` | 212 lines |
| `ACC-BLD-B-SW1` | **Access Switch BLD-B #1** | `exports/campus/ACC-BLD-B-SW1.ios` | 319 lines |
| `ACC-BLD-B-SW2` | **Access Switch BLD-B #2** | `exports/campus/ACC-BLD-B-SW2.ios` | 319 lines |
| `ACC-BLD-B-SW3` | **Access Switch BLD-B #3** | `exports/campus/ACC-BLD-B-SW3.ios` | 319 lines |
| `ACC-BLD-B-SW4` | **Access Switch BLD-B #4** | `exports/campus/ACC-BLD-B-SW4.ios` | 319 lines |
| `ACC-BLD-B-SW5` | **Access Switch BLD-B #5** | `exports/campus/ACC-BLD-B-SW5.ios` | 319 lines |
| `ACC-BLD-B-SW6` | **Access Switch BLD-B #6** | `exports/campus/ACC-BLD-B-SW6.ios` | 319 lines |
| `ACC-BLD-B-SW7` | **Access Switch BLD-B #7** | `exports/campus/ACC-BLD-B-SW7.ios` | 319 lines |
| `ACC-BLD-B-SW8` | **Access Switch BLD-B #8** | `exports/campus/ACC-BLD-B-SW8.ios` | 319 lines |
| `ACC-BLD-B-SW9` | **Access Switch BLD-B #9** | `exports/campus/ACC-BLD-B-SW9.ios` | 319 lines |
| `ACC-BLD-B-SW10` | **Access Switch BLD-B #10** | `exports/campus/ACC-BLD-B-SW10.ios` | 319 lines |
| `ACC-BLD-B-SW11` | **Access Switch BLD-B #11** | `exports/campus/ACC-BLD-B-SW11.ios` | 319 lines |
| `ACC-BLD-B-SW12` | **Access Switch BLD-B #12** | `exports/campus/ACC-BLD-B-SW12.ios` | 319 lines |
| `ACC-BLD-B-SW13` | **Access Switch BLD-B #13** | `exports/campus/ACC-BLD-B-SW13.ios` | 319 lines |
| `ACC-BLD-B-SW14` | **Access Switch BLD-B #14** | `exports/campus/ACC-BLD-B-SW14.ios` | 319 lines |
| `ACC-BLD-B-SW15` | **Access Switch BLD-B #15** | `exports/campus/ACC-BLD-B-SW15.ios` | 319 lines |
| `ACC-BLD-B-SW16` | **Access Switch BLD-B #16** | `exports/campus/ACC-BLD-B-SW16.ios` | 319 lines |
| `DIST-BLD-C` | **Distribution Switch Building C (Admin)** | `exports/campus/DIST-BLD-C.ios` | 172 lines |
| `ACC-BLD-C-SW1` | **Access Switch BLD-C #1** | `exports/campus/ACC-BLD-C-SW1.ios` | 319 lines |
| `ACC-BLD-C-SW2` | **Access Switch BLD-C #2** | `exports/campus/ACC-BLD-C-SW2.ios` | 319 lines |
| `ACC-BLD-C-SW3` | **Access Switch BLD-C #3** | `exports/campus/ACC-BLD-C-SW3.ios` | 319 lines |
| `ACC-BLD-C-SW4` | **Access Switch BLD-C #4** | `exports/campus/ACC-BLD-C-SW4.ios` | 319 lines |
| `ACC-BLD-C-SW5` | **Access Switch BLD-C #5** | `exports/campus/ACC-BLD-C-SW5.ios` | 319 lines |
| `ACC-BLD-C-SW6` | **Access Switch BLD-C #6** | `exports/campus/ACC-BLD-C-SW6.ios` | 319 lines |
| `ACC-BLD-C-SW7` | **Access Switch BLD-C #7** | `exports/campus/ACC-BLD-C-SW7.ios` | 319 lines |
| `ACC-BLD-C-SW8` | **Access Switch BLD-C #8** | `exports/campus/ACC-BLD-C-SW8.ios` | 319 lines |
| `ACC-BLD-C-SW9` | **Access Switch BLD-C #9** | `exports/campus/ACC-BLD-C-SW9.ios` | 319 lines |
| `ACC-BLD-C-SW10` | **Access Switch BLD-C #10** | `exports/campus/ACC-BLD-C-SW10.ios` | 319 lines |
| `ACC-BLD-C-SW11` | **Access Switch BLD-C #11** | `exports/campus/ACC-BLD-C-SW11.ios` | 319 lines |

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
| `V-02` | **Root Network Containment Check** | PASS ✅ | All subnets are contained within root block 10.20.0.0/16. |
| `V-03` | **Gateway Subnet Belonging Check** | PASS ✅ | All gateway IP addresses belong to their respective subnet address blocks. |
| `V-04` | **Wildcard Mask Inversion Check** | PASS ✅ | All wildcard masks independently verified against bitwise complement (~netmask). |
| `V-05` | **Host Capacity Sufficiency Check** | PASS ✅ | All carved subnets provide usable host capacity >= requested demand. |
| `V-06` | **VLAN Safety & Native Hardening Check** | PASS ✅ | VLAN IDs are unique, within range 1..4094, and native VLAN 99 is unused for access. |
| `V-07` | **Link Endpoint Existence Check** | PASS ✅ | All physical and logical links terminate on valid, known devices. |
| `V-08` | **Physical Media Feasibility Check** | PASS ✅ | All physical link runs strictly obey IEEE 802.3 transceiver reach limits. |
| `V-09` | **Routing Advertisement Consistency Check** | PASS ✅ | All OSPF network statements map directly to allocated VLSM subnets. |

---
*Report generated by NetArchitect Recommendation & Config Engine (CIC-307).*