# NetArchitect — System Architecture & Design Document

**Course:** CIC-307: Computer Networks Mini-Project  
**Project:** NetArchitect: Algorithmic Network Recommendation & Configuration Engine  

---

## 1. System Overview

NetArchitect is an algorithmic network planning utility designed to automate the design, subnet calculation, routing planning, and Cisco configuration generation for enterprise network topologies.

Given a high-level network specification (either via built-in presets or custom JSON requirements), NetArchitect executes a deterministic pipeline of pure domain engines to produce:
1. Validated physical topology graphs and port mappings.
2. 802.1Q VLAN assignments with hardened native VLAN policies.
3. Zero-overlap bitwise VLSM subnet plans (including RFC 3021 `/31` point-to-point subnets).
4. Layer 3 routing configurations (OSPF Single/Multi-Area, eBGP, Route Summarization, DiffServ QoS).
5. Copy-paste ready Cisco IOS configuration files for switches and routers.
6. A self-explaining architectural design report with RFC and IEEE normative justifications.

---

## 2. Pipeline Architecture & Decision Flow

The application executes as a modular pipeline where each stage takes strongly typed intermediate models and produces immutable artifacts:

```
Input JSON (Preset / Custom)
        │
        ▼
[1. Profile Ingestion & Validation] ──── Zod schema & semantic link checks
        │
        ▼
[2. Physical Media Engine (L1)]     ──── Distance & attenuation physics (IEEE 802.3)
        │
        ▼
[3. Topology Graph Builder]         ──── Collapsed-core / 3-tier hierarchy & port sizing
        │
        ▼
[4. 802.1Q VLAN Planner]            ──── Trunk pruning, native VLAN 99 hardening
        │
        ▼
[5. Bitwise VLSM Allocator (L3)]    ──── Monotonic descending carve, RFC 3021 /31, /32
        │
        ▼
[6. Layer 3 Routing Engine]         ──── OSPF Area 0, Multi-Area, eBGP, DiffServ QoS
        │
        ▼
[7. Cisco IOS Config Generator]     ──── Two-stage intermediate device model & renderer
        │
        ▼
[8. Invariant Verification Service] ──── Pairwise overlap check, capacity, wildcard masks
        │
        ▼
[9. Report & Artifact Exporter]     ──── 12-section Markdown report & .cfg files
```

---

## 3. Core Engine Specifications

### 3.1 Parameter Validation (`src/validation/`)
- Ingests network requirements from JSON using Zod schemas.
- Validates CIDR block alignments, host capacity constraints, building/site coordinates, and transport parameters.
- Validates that link endpoints reference valid sites and devices before pipeline execution proceeds.

### 3.2 Physical Media Engine (`src/engines/media/`)
- Evaluates link distances and bandwidth requirements against IEEE 802.3 physical layer constraints:
  - **Run ≤ 100 m (LAN Access):** Cat6a UTP / 10GBASE-T (IEEE 802.3an limit).
  - **Run 101–400 m (Campus Backbone):** OM4 Multimode Fiber / 10GBASE-SR (850 nm VCSEL dispersion limit).
  - **Run > 400 m (MAN / WAN Interconnect):** OS2 Single-Mode Fiber / 10GBASE-LR (≤ 10 km) or 10GBASE-ER (≤ 40 km).
- **Physical Distance Violations:** If copper is explicitly requested for links exceeding 100 meters, the engine raises a `PhysicalDistanceViolationError` with a signal attenuation warning.

### 3.3 Topology Builder (`src/engines/topology/`)
- Constructs the network graph hierarchy:
  - **Campus LAN:** Collapsed-core topology with redundant Catalyst 3560 core switches and Catalyst 2960 distribution/access stacks.
  - **Metro MAN:** High-availability hub-and-spoke connecting HQ colocation to remote branch offices over leased EVPL circuits.
  - **Global WAN:** Dual-homed regional enterprise routers connecting distributed branch cities to an AWS Cloud VPC gateway over IPsec tunnels and eBGP.
- Computes port requirements with 20% growth headroom and 4 reserved uplink trunks.

### 3.4 802.1Q VLAN Planning (`src/engines/vlan/`)
- Allocates unique 802.1Q VLAN IDs across departmental networks (Management, Staff, Lab/IoT, Guest).
- Enforces trunk etiquette:
  - Explicit `switchport trunk allowed vlan` lists to prune unnecessary broadcast domains.
  - Hardens native VLANs by setting `switchport trunk native vlan 99` as an isolated container carrying zero user traffic, protecting against 802.1Q double-tagging attacks.

### 3.5 Bitwise VLSM Allocator (`src/engines/vlsm/`)
- Operates on unsigned 32-bit integers (`>>> 0`) for bitwise arithmetic.
- Sorts host demands descending to ensure contiguous, monotonic block carving without fragmentation.
- Implements RFC 3021 (`/31` subnets) for two-host point-to-point links (both IPs usable, no network/broadcast overhead) and `/32` for loopbacks.
- Calculates exact network addresses, subnet masks, inverse wildcard masks (`~mask >>> 0`), broadcast addresses, and default gateway reservations (`firstHost`).

### 3.6 Layer 3 Routing Engine (`src/engines/routing/`)
- **Protocol Chooser:**
  - Single autonomous system with < 50 subnets: Configures **Single-Area OSPF (Area 0)** for fast link-state convergence.
  - Multi-site / multi-region infrastructure: Deploys **Multi-Area OSPF** with an Area 0 backbone to limit LSA flooding and localize SPF recalculations.
  - External Cloud VPC / Autonomous System boundary: Configures **eBGP peering** with supernet route summarization.
- **DiffServ QoS:** Implements 4-class queuing policies on constrained WAN/EVPL links (EF Voice with 30% priority queue, AF31 Transactional with 40% bandwidth queue).

### 3.7 Cisco Configuration Generator (`src/configuration/`)
- Two-stage architecture:
  1. **Intermediate Device Model:** Maps devices to structured interface models, VLAN databases, ACL entries, and routing blocks.
  2. **Packet Tracer Compatible Renderer:** Emits standard Cisco IOS commands verified parseable in Cisco Packet Tracer (v8.2+) and GNS3.
- Generates complete configs including system banners, trunk encapsulation, SVI IP configurations, OSPF/BGP router statements, and VTY SSH management hardening.

### 3.8 Verification Service (`src/verification/`)
- Acts as a verification gate before file export:
  - `V-01`: Independent pairwise intersection test across all allocated subnets to guarantee zero overlap.
  - `V-02`: Host capacity verification against requested allocations.
  - `V-03`: Wildcard mask inversion check (`wildcard === ~mask`).
  - `V-04`: VLAN ID validity and native VLAN 99 hardening verification.
  - `V-05`: Media reachability validation against transceiver physical maximums.

---

## 4. Key Architectural Decisions

1. **Pure Bitwise Subnet Math:** Eliminates external subnetting libraries. All calculations run with bitwise shift and mask operators on unsigned 32-bit numbers, eliminating precision and off-by-one errors.
2. **Descending-Order Subnet Carving:** Guarantees that larger power-of-two address blocks align naturally on their own binary boundaries, preventing address fragmentation and overlap.
3. **Structured Intermediate Device Models:** Prevents "string template spaghetti" by decoupling device configuration state from IOS syntax rendering.
4. **First-Class Explainability Records:** Every engine emits structured `EngineeringDecision` records so architectural rationales and RFC references are logged during execution rather than retroactively fabricated.

---

## 5. Engineering Assumptions & Constants

- **Access Point Density:** Modeled at 1 802.3at PoE+ AP per 24 endpoints.
- **Port Headroom:** Switch port requirements include 20% active port growth headroom.
- **Metro EVPL Latency:** Modeled using 5 µs/km fiber propagation delay plus 100 µs per-hop switching delay against the 5 ms SLA.
- **Packet Tracer Support:** Emits commands fully recognized by standard Packet Tracer platforms (Catalyst 2960/3560 switches and ISR 4331/2911 routers).
