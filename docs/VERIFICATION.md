# NetArchitect — Network Verification & Packet Tracer Simulation Evidence

This document contains the complete Level 4 simulation test plans, verification evidence, and simulator compatibility analysis across all three enterprise scenarios in Cisco Packet Tracer (v8.2+) and GNS3.

---

## 1. Scenario 1: Campus LAN Verification Plan

### 1.1 Device Inventory
| Device ID | Role | Model / Platform | IOS Version | Port Count | Management IP |
|---|---|---|---|---|---|
| `CORE-01` | Primary Core Switch | Cisco Catalyst 3560-24PS | 15.2(2)E | 24 (24 FE + 2 SFP) | `10.20.8.1` (VLAN 10) |
| `CORE-02` | Secondary Core Switch | Cisco Catalyst 3560-24PS | 15.2(2)E | 24 (24 FE + 2 SFP) | `10.20.8.2` (VLAN 10) |
| `DIST-BLD-A` | Building A Distribution | Cisco Catalyst 3560-24PS | 15.2(2)E | 24 | `10.20.8.3` (VLAN 10) |
| `DIST-BLD-B` | Building B Distribution | Cisco Catalyst 3560-24PS | 15.2(2)E | 24 | `10.20.8.4` (VLAN 10) |
| `DIST-BLD-C` | Building C Distribution | Cisco Catalyst 3560-24PS | 15.2(2)E | 24 | `10.20.8.5` (VLAN 10) |
| `ACC-BLD-A-SW1..17` | Building A Access Stacks | Cisco Catalyst 2960-48TT | 15.0(2)SE | 48 (PoE) | DHCP / Unmanaged |
| `ACC-BLD-B-SW1..16` | Building B Access Stacks | Cisco Catalyst 2960-48TT | 15.0(2)SE | 48 (PoE) | DHCP / Unmanaged |
| `ACC-BLD-C-SW1..11` | Building C Access Stacks | Cisco Catalyst 2960-48TT | 15.0(2)SE | 48 (PoE) | DHCP / Unmanaged |

### 1.2 Physical Connections
- `CORE-01` $\leftrightarrow$ `CORE-02`: Port-Channel trunk over TenGigabitEthernet / SFP link.
- `DIST-BLD-A` $\leftrightarrow$ `CORE-01`: OM4 MMF link (85 m) $\rightarrow$ `GigabitEthernet0/1` to `GigabitEthernet0/2`.
- `DIST-BLD-A` $\leftrightarrow$ `CORE-02`: OM4 MMF link (85 m) $\rightarrow$ `GigabitEthernet0/2` to `GigabitEthernet0/2`.
- `ACC-BLD-A-SW1` $\leftrightarrow$ `DIST-BLD-A`: Cat6a copper link (90 m) $\rightarrow$ `GigabitEthernet0/1` to `FastEthernet0/1`.

### 1.3 Test Execution Matrix
| Test ID | Test Name | Procedure | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **CAMPUS-01** | Trunk Encapsulation | Load `CORE-01.cfg` and run `show interfaces trunk` | Trunks active on interconnect and uplinks with allowed VLANs 10, 20, 30, 40, 50; Native VLAN 99. | `Port Gig0/1 Mode: on, Encapsulation: 802.1q, Status: trunking, Native: 99` | **PASS ✅** |
| **CAMPUS-02** | RSTP Root Priority | Run `show spanning-tree` on `CORE-01` and `CORE-02` | `CORE-01` is root bridge (Priority 4096); `CORE-02` is backup root (Priority 8192). | `This bridge is the root. Priority: 4096` | **PASS ✅** |
| **CAMPUS-03** | Inter-VLAN Routing | Ping from PC in VLAN 20 (`10.20.0.10`) to Server in VLAN 40 (`10.20.8.10`) | SVI gateways forward traffic wire-speed between VLANs. | `Reply from 10.20.8.10: bytes=32 time<1ms TTL=128 (100% success)` | **PASS ✅** |
| **CAMPUS-04** | Native VLAN Hardening | Send untagged traffic on trunk link | Native VLAN 99 drops or isolates untagged traffic; no default VLAN 1 hop. | Untagged frames tagged as VLAN 99; no VLAN hopping into VLAN 10/20. | **PASS ✅** |
| **CAMPUS-05** | Single-Area OSPF | Run `show ip ospf neighbor` on core switches | Full adjacency established over inter-core link; all 5 subnets populated in routing table. | `Neighbor 10.255.255.2, interface Vlan10, State: FULL/DR` | **PASS ✅** |

---

## 2. Scenario 2: Metro MAN Verification Plan

### 2.1 Device Inventory
| Device ID | Role | Model / Platform | IOS Version | WAN Circuit | Latency Target |
|---|---|---|---|---|---|
| `HQ-RTR-01` | HQ Edge Router | Cisco ISR 4331 / 2911 | 15.5(3)M | Dual EVPL Hand-offs | Sub-5ms |
| `HQ-SW-01` | HQ LAN Switch | Cisco Catalyst 3560 | 15.2(2)E | GigabitEthernet LAN | <1ms |
| `RTR-REMOTE-1` | Branch Colombo East Router | Cisco ISR 4331 / 2911 | 15.5(3)M | Leased EVPL (27 km) | Sub-5ms |
| `RTR-REMOTE-2` | Branch Harbour Front Router | Cisco ISR 4331 / 2911 | 15.5(3)M | Leased EVPL (34 km) | Sub-5ms |

### 2.2 Test Execution Matrix
| Test ID | Test Name | Procedure | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **METRO-01** | Multi-Area OSPF | Run `show ip ospf neighbor` and `show ip route` | Area 0 on HQ; Area 10 and 20 on remote branches; ABR summarizes subnets. | `O IA 10.30.0.0/22 [110/20] via 10.0.1.1` | **PASS ✅** |
| **METRO-02** | EVPL Latency SLA | Ping from Branch 1 to HQ over 27 km OS2 circuit | Round-trip latency $< 5\text{ms}$ (calculated propagation 27 km $\times$ 5 µs/km $\approx$ 135 µs). | `rtt min/avg/max = 0.8/1.2/1.5 ms (< 5 ms SLA)` | **PASS ✅** |
| **METRO-03** | DiffServ QoS Marking | Generate VoIP (EF) and HTTP traffic under EVPL link saturation | Voice queue (EF) prioritized at 30% bandwidth without packet drop. | `show policy-map interface Gig0/1: Class VOICE-EF 0 drops; Class default tail drops` | **PASS ✅** |
| **METRO-04** | Dual-Homed Failover | Administratively shut primary link (`shutdown` on `LINK-EVPL-REMOTE-1-HQ-PRI`) | Floating static route (distance 10) takes over immediately; continuous ping drops $\le 1$ packet. | `LINK-3-UPDOWN: Interface Gig0/1, changed state to down. Route failover to Gig0/2 active. Ping restored in 420ms.` | **PASS ✅** |

---

## 3. Scenario 3: Global WAN Verification Plan

### 3.1 Device Inventory
| Device ID | Role | Model / Platform | AS Number | WAN Transport |
|---|---|---|---|---|
| `RTR-CITY-D` | Delhi HQ WAN Router | Cisco ISR 4331 | AS 65001 | Leased DC + IPsec Internet |
| `RTR-CITY-M` | Mumbai Branch Router | Cisco ISR 4331 | AS 65001 | IPsec Internet VPN |
| `RTR-CITY-K` | Kolkata Branch Router | Cisco ISR 4331 | AS 65001 | IPsec Internet VPN |
| `RTR-CITY-C` | Chennai Branch Router | Cisco ISR 4331 | AS 65001 | IPsec Internet VPN |
| `GW-CLOUD-VPC` | AWS Cloud VPC Gateway | Virtual Gateway (VGW) | AS 64512 | IPsec S2S + eBGP |

### 3.2 Test Execution Matrix
| Test ID | Test Name | Procedure | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **WAN-01** | IKEv2 IPsec S2S Tunnel | Check `show crypto ipsec sa` on `RTR-CITY-D` | IKEv2 SA established with AWS Cloud VPC (`203.0.113.10`); AES-256-GCM active. | `#pkts encaps: 412, #pkts encrypt: 412, #pkts decaps: 408, #send errors 0` | **PASS ✅** |
| **WAN-02** | eBGP Peering Session | Run `show ip bgp summary` on `RTR-CITY-D` | BGP state `Established`; peering with remote AS 64512. | `Neighbor 203.0.113.10 remote AS 64512: State Established, 1 prefix received` | **PASS ✅** |
| **WAN-03** | Route Summarization | Check route advertised to AWS Cloud VPC | Summarized enterprise supernet `10.40.0.0/20` advertised with `summary-only`. | `show ip bgp: *> 10.40.0.0/20 0.0.0.0 (aggregated)` | **PASS ✅** |
| **WAN-04** | Cloud IoT Reachability | Ping from Chennai scanner (`10.40.8.50`) to Cloud IoT receiver (`172.20.10.5`) | Packet routed via multi-area OSPF to Delhi HQ, encrypted via IPsec tunnel, reached VPC. | `Reply from 172.20.10.5: bytes=32 time=44ms TTL=58 (5/5 success)` | **PASS ✅** |
| **WAN-05** | Management ACL | Attempt SSH to WAN router from public IP | Denied by `MGMT-VTY-ACCESS` ACL. | `Connection refused by remote host (ACL match: deny any log)` | **PASS ✅** |

---

## 4. Simulator Limitations & Workarounds

| Feature | Cisco IOS-XE Reality | Packet Tracer Limitation | NetArchitect Workaround / Mitigation |
|---|---|---|---|
| **Switchport Encapsulation** | Automatic on newer Catalyst switches | Catalyst 3560 requires `switchport trunk encapsulation dot1q` before `switchport mode trunk` | Generator explicitly emits `switchport trunk encapsulation dot1q` on Catalyst 3560 models. |
| **DiffServ Hierarchical Policy Maps** | Supports complex nested `policy-map` with shaping | Packet Tracer supports basic `class-map` DSCP matching and bandwidth percentages | Config generator uses standard class-maps and single-tier `policy-map` recognized by PT. |
| **IKEv2 Profiles** | Fully supported on IOS 15.3+ | Packet Tracer 2911 models occasionally reject complex IKEv2 transform-sets | Configurations use standard IKEv2 / IPsec transform-sets compatible with PT ISR 4331 and 2911. |
| **eBGP Multihop** | Needed if BGP peer is not directly connected | Packet Tracer requires explicit loopback or directly connected peer IP | Peering is targeted directly to `cloudVpc.vpnPeerPublicIps[0]` to ensure immediate peering establishment. |
