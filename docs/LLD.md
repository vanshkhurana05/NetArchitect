# NetArchitect — Low-Level Design (LLD)

Per-module algorithmic details, data structures, and rule triggers.
Frozen contract signatures live in `src/contracts/`; this document records the *algorithms and logic* behind each component.

---

## 1. Profiles & Validation Engine (`src/profiles/`, `src/validation/`)
- **Ingestion Entrypoints:**
  - `loadPreset(name)`: Reads `presets/<name>.json`, parses with Zod schemas, validates semantic invariants, and tags `source: "preset"`.
  - `validateCustom(raw)`: Ingests raw JSON object/string, applies profile discrimination, and tags `source: "custom"`.
- **Validation Layers:**
  1. *Schema layer (`src/validation/input.checks.ts`)*: Zod schemas ensuring non-empty names, positive integers, valid IPv4 CIDR formats, building count = 3 for campus, site count 3..6 for metro, city count 4..8 for WAN.
  2. *Link & capacity semantic checks (`src/validation/link.checks.ts`, `src/validation/cidr.ts`)*:
     - Cloud role isolation: rejection `CLOUD_ROLE_IN_CITIES` if a city has role `cloud-vpc` (ADR-009).
     - Capacity pre-check: quick bitwise calculation comparing total requested VLAN hosts against root CIDR capacity.
     - Boundary checks: values at boundary limits (e.g. 100m, 400m, 15km, 35km, 5ms) emit informative advisories without throwing errors.

---

## 2. Physical Media Engine (`src/engines/media/`)
- **Normative Rules Table (`src/engines/media/rules.ts`):**
  | Rule ID | Condition | Medium | Standard | Reach | Reference |
  |---|---|---|---|---|---|
  | `MEDIA.01` | run ≤ 100 m (access) | Cat6a | 10GBASE-T | 100 m | IEEE 802.3an |
  | `MEDIA.02` | 101 m ≤ run ≤ 400 m (backbone) | OM4 MMF | 10GBASE-SR | 400 m | IEEE 802.3ae (850 nm modal dispersion) |
  | `MEDIA.03` | 401 m ≤ run ≤ 10,000 m | OS2 SMF | 10GBASE-LR | 10 km | IEEE 802.3ae (1310 nm DFB laser) |
  | `MEDIA.04` | 10,001 m ≤ run ≤ 40,000 m | OS2 SMF | 10GBASE-ER | 40 km | IEEE 802.3ae (1550 nm optical power budget) |
  | `MEDIA.05` | Copper requested for run > 100 m | — | — | — | Raise `PhysicalDistanceViolationError` |
  | `MEDIA.06` | Run > 40,000 m | — | — | — | Raise `ReachabilityError` |

- **Design Split:** Separation between *threshold-exact distance policy* (`rules.ts`) and the *extensible physical transceiver catalog* (`transceivers.ts`).
- **Explainability:** Emits structured `ExplainRecord` referencing IEEE standards and exact boundary thresholds.

---

## 3. Topology Engine (`src/engines/topology/`)
- **Campus LAN Profile:**
  - Structure: Collapsed-core architecture. 2 Core Switches (`CORE-01`, `CORE-02`) connected via cross-chassis port-channel / 10G link.
  - Per Building: 1 Distribution/Access switch stack per building (`DIST-BLD-A`, `DIST-BLD-B`, `DIST-BLD-C`).
  - Inter-tier Links: Dual uplinks from each building distribution switch to both Core switches (`DIST-BLD-X` ↔ `CORE-01`, `DIST-BLD-X` ↔ `CORE-02`) using OM4 MMF (`MEDIA.02`).
  - Access Links: Cat6a runs (`MEDIA.01`) for workstation and PoE AP drops.
- **Metro MAN Profile:**
  - Structure: 1 HQ Core/Edge Router (`HQ-RTR-01`), 2 Remote Site Edge Routers (`REMOTE-RTR-01`, `REMOTE-RTR-02`).
  - Circuits: Leased EVPL circuits over OS2 SMF (10GBASE-ER) connecting remote sites to HQ.
  - Dual-Homing: Redundant secondary circuit to secondary provider handoff when `dualHomedFailover: true`.
- **Global WAN Profile:**
  - Structure: Per-city WAN Edge Routers (`NYC-WAN-01`, `LON-WAN-01`, `TYO-WAN-01`, `SGP-WAN-01`).
  - Cloud Attachment: Cloud VPC gateway (`AWS-VPC-GW`) terminating IPsec tunnels.
  - Inter-site connectivity: Leased DC circuits for HQ/critical sites and IPsec VPN over public Internet for branch cities.

---

## 4. VLAN Engine (`src/engines/vlan/`)
- **802.1Q Numbering:**
  - VLAN IDs allocated deterministically starting from 10 (`VLAN 10`, `VLAN 20`, `VLAN 30`, ...), incrementing by 10 per request.
  - Hardening rule: Native VLAN set to 99 (`NATIVE_VLAN = 99`), untagged and unused for user traffic. Default VLAN 1 is strictly disabled for trunk carry.
- **Trunking Etiquette:**
  - All inter-switch links designated as 802.1Q trunks with explicit `switchport trunk allowed vlan` lists matching planned VLAN IDs.
  - Access ports assigned exclusively to their designated VLAN (`switchport mode access`, `switchport access vlan <id>`).
- **SVI Allocation:**
  - Core/distribution L3 switches assigned Switch Virtual Interfaces (SVIs) with IP addresses derived from the VLSM plan (first usable host).

---

## 5. VLSM Engine (`src/engines/vlsm/`)
- **Bitwise Allocator (`src/engines/vlsm/allocator.ts`):**
  1. Requests sorted in **strictly descending order** of required host capacity.
  2. Prefix calculation (`hostsToPrefix`):
     - RFC 3021: Point-to-point requests (2 hosts) allocate a `/31` prefix (2 total addresses, both usable, no network/broadcast wastage).
     - Single host (1 host) allocates `/32` (loopback semantics).
     - Standard subnets (≥3 hosts): Smallest prefix $P$ satisfying $2^{(32 - P)} - 2 \ge \text{hosts}$.
  3. Carving: Sequentially carves aligned subnets starting at the root base IP. Next block begins at current block's upper bound.
  4. Invariant Protection: Overlap check between each carved block; overlapping blocks trigger `SubnetOverlapError`.
  5. Exhaustion: If remaining space in the root CIDR is insufficient, raises `AddressSpaceExhaustedError`.
  6. Subnet Metadata: Computes network IP, netmask, wildcard mask (bitwise inverse `~mask & 0xFFFFFFFF`), broadcast address, first usable host, last usable host, gateway IP (first usable), and utilization percentage.

---

## 6. Routing Engine (`src/engines/routing/`)
- **Protocol Selector Logic:**
  - Single Autonomous System & $\le 50$ subnets $\rightarrow$ **Single-Area OSPF (Area 0)** (RFC 2328 link-state convergence).
  - Multi-site / Campus-to-Metro / MAN $\rightarrow$ **Multi-Area OSPF**: Core site in Area 0, remote sites assigned distinct areas (Area 10, Area 20), summarized at ABRs.
  - Multi-site + Cloud VPC $\rightarrow$ **Multi-Area OSPF + eBGP** (RFC 4271): OSPF within enterprise boundaries; eBGP peering over IPsec tunnels to AWS/Azure/GCP VPC using private AS numbers (e.g. AS 65001 to AS 64512).
- **Route Summarization:**
  - Area Border Routers (ABRs) configured with `area <id> range <summary-cidr>` to collapse internal routes and minimize LSDB flooding.
  - BGP aggregates configured with `aggregate-address <cidr> summary-only`.
- **IPsec VPN Configuration:**
  - IKEv2 Proposal: AES-GCM-256 / SHA-384 / DH Group 19/20.
  - Crypto ACLs protecting internal carved subnets toward VPC CIDR.
- **QoS Class Mapping (Metro MAN):**
  - EF (Expedited Forwarding): Voice (30% priority queue).
  - AF31: Transactional / FinTech data (40% bandwidth queue).
  - AF21: Video / Collaboration (20% bandwidth queue).
  - Best-Effort: Remaining traffic class (10% default queue).

---

## 7. Configuration Generator (`src/engines/configgen/`)
- **Target Platform:** Cisco IOS / IOS-XE syntax.
- **Packet Tracer Compatibility Mode:**
  - Emits standard Cisco commands recognized by Cisco Packet Tracer (models 2960, 3560, 3650, 2911, 4331).
  - Flags or simplifies unsupported commands (e.g. substituting standard crypto map commands for legacy PT routers if IKEv2 is restricted).
- **Template Blocks Per Device:**
  1. System header: `hostname <name>`, `service timestamps`, `no ip domain-lookup`.
  2. VLAN database: `vlan <id>`, `name <name>`.
  3. L2/L3 Interfaces: `interface GigabitEthernet...`, `description ...`, `switchport mode trunk/access`, `switchport trunk allowed vlan ...`.
  4. SVI interfaces: `interface Vlan<id>`, `ip address <ip> <mask>`.
  5. Routing: `router ospf <process-id>`, `router-id <id>`, `network <net> <wildcard> area <area>`, `area <id> range ...`.
  6. BGP: `router bgp <asn>`, `neighbor <ip> remote-as <asn>`, `network <net> mask <mask>`.
  7. Management hardening: console line passwords, VTY SSH lines (`transport input ssh`), `login local`.

---

## 8. Verification Engine (`src/engines/verify/`)
- **Fail-Closed Gate:** Must return `passed: true` before `ExportManager` is invoked.
- **Automated Verification Checks:**
  - `V-01 (Zero Overlap)`: Independent pairwise intersection test on every allocated subnet.
  - `V-02 (Host Capacity)`: Independent check that every subnet satisfies `capacity >= requested`.
  - `V-03 (Wildcard Inversion)`: Independent recomputation of wildcard masks (`wildcard === ~mask`) across all subnets.
  - `V-04 (VLAN Safety)`: Uniqueness of VLAN IDs (1..4094), non-overlap, and verification that native VLAN 99 carries no access traffic.
  - `V-05 (Media Reachability)`: Verifies that no physical link exceeds transceiver standard reach (no copper > 100m).
  - `V-06 (Topology-Routing Consistency)`: Verifies all router IDs and interface references in OSPF/BGP exist in Topology devices.
  - `V-07 (Metro SLA Latency)`: Computes latency across EVPL hops (propagation 5 µs/km + switching delay) and validates against `latencyTargetMs` (≤ 5ms).
  - `V-08 (Edge Case Subnets)`: Verifies `/31` point-to-point and `/32` loopback wildcard mask correctness.

---

## 9. Export Manager (`src/engines/export/`)
- Produces deterministic directory layout under `exports/<scenario>/`:
  ```
  exports/<scenario>/
  ├─ manifest.json          # Artifact manifest + byte sizes + ISO timestamp
  ├─ report.md              # Full engineering design report + natural-language justifications
  ├─ design.json            # Structured intermediate models (NetworkDesign)
  ├─ verification.md        # Audit scorecard of V-01..V-08 verification checks
  ├─ explain-log.json       # Machine-readable explainability event log
  └─ configs/
     ├─ CORE-01.ios
     ├─ DIST-BLD-A.ios
     └─ ...
  ```

---

## 10. Application Orchestrator & CLI (`src/orchestrator/`)
- **Composition Root:** Wires stages 1 through 9 sequentially with zero engine-to-engine coupling.
- **Timing & Telemetry:** Records execution milliseconds per pipeline stage in `RunReport.stages`.
- **CLI Commands:**
  - `netarch run --preset <name> [--out exports]`
  - `netarch run --input <custom.json> [--out exports]`
  - `netarch validate --input <custom.json>`
