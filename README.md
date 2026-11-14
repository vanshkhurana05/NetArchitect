# NetArchitect: Recommendation & Config Engine
### Algorithmic Network Planning & Self-Explaining Architecture Engine

[![Tests](https://img.shields.io/badge/tests-184%20passed%20%7C%2023%20suites-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.5-blue.svg)]()
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-informational.svg)]()
[![Cisco IOS](https://img.shields.io/badge/cisco-IOS%20%2F%20Packet%20Tracer%20Ready-orange.svg)]()
[![Course](https://img.shields.io/badge/course-CIC--307%20Computer%20Networks-blueviolet.svg)]()

> **Course:** CIC-307: Computer Networks Mini-Project  
> **Submission Deadline:** 10 November 2026  
> **Weight:** 100 Points Total  
> **Format:** Team (2) / Individual Submission  

NetArchitect is an algorithmic network planning tool developed for the CIC-307 Computer Networks mini-project. It ingests enterprise network specifications (either from built-in presets or custom JSON inputs), executes algorithmic decision engines across Layers 1 to 3, and generates clean, human-readable architecture reports alongside copy-paste ready Cisco IOS configuration files.

---

## 📌 Table of Contents

- [Project Overview & Supported Profiles](#-project-overview--supported-profiles)
- [How the Engine Works](#-how-the-engine-works)
- [Key Engineering Modules](#-key-engineering-modules)
- [Quick Start & Running the Tool](#-quick-start--running-the-tool)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Deliverables & Rubric Checklist](#-deliverables--rubric-checklist)
- [AI Code Audit & Defense Log](#-ai-code-audit--defense-log)
- [Packet Tracer Simulation & Verification](#-packet-tracer-simulation--verification)

---

## 🌐 Project Overview & Supported Profiles

NetArchitect supports the three required project profiles and accepts custom JSON definitions:

| Profile | Archetype | Scale & Hardware Modeling | Protocols & Standards | Focus & Constraints |
|---|---|---|---|---|
| **Profile 1** | **Campus LAN** | 3 Buildings, < 400m, 8 managed devices (2 Core, 3 Dist, 3 Access Stacks), 1,600 endpoints | Cat6a vs OM4 MMF, 802.1Q VLANs, RSTP, Single-Area OSPF | 802.3at PoE APs, root bridge priorities (4096/8192), native VLAN 99 hardening |
| **Profile 2** | **Metro MAN** | HQ Colocation + 2 Remote Branches (15–35 km), 6 devices | OS2 SMF (10GBASE-ER), EVPL circuits, Multi-Area OSPF | 4-class DiffServ QoS, sub-5ms SLA latency target, dual-homed failover |
| **Profile 3** | **Global WAN** | 4 Regional Metro Cities + AWS Cloud VPC, 5 devices | IPsec VPN (IKEv2), eBGP (AS 65001 / 64512), Route Summarization | 2,000 IoT node isolation, supernet aggregation (`10.40.0.0/20`), VTY line hardening |
| **Custom** | **Smart Campus** | 3 Facilities (Science Hall, Admin, Library), 1,600 endpoints | Cat6a vs OM4 MMF, 802.1Q VLANs, RSTP, Single-Area OSPF | Custom `10.100.0.0/16` root block, 6 sorted departments (`presets/custom-campus.json`) |

> **Note on Campus LAN Topology Sizing:**  
> The engine algorithmically calculates physical access switch requirements based on 1,600 drops and a 20% growth buffer (744 drops in Building A $\rightarrow$ 17 switches; 696 drops in Building B $\rightarrow$ 16 switches; 480 drops in Building C $\rightarrow$ 11 switches). To ensure configurations can be loaded and tested in Cisco Packet Tracer without freezing, the deployment topology represents each building's access tier as a **Catalyst StackWise Switch Stack** (`ACC-BLD-A`, `ACC-BLD-B`, `ACC-BLD-C`). The full 49-chassis inventory can still be generated using the `--full-chassis` flag if a complete hardware bill of materials is required.

---

## ⚙️ How the Engine Works

NetArchitect processes network requirements through a pipeline of deterministic domain engines:

```
                  Input Ingestion (Preset or Custom JSON)
                                    │
                                    ▼
              [1. Media Engine & Distance Physics (Layer 1)]
               Cat6a ≤ 100m, OM4 MMF ≤ 400m, OS2 SMF > 400m
                                    │
                                    ▼
              [2. Topology Graph & Port Sizing (Layer 2)]
               Collapsed Core, redundant uplinks, RSTP priorities
                                    │
                                    ▼
              [3. 802.1Q VLAN Planner & Trunk Hardening]
               Trunk pruning, native VLAN 99 isolation, VLAN 1 disabled
                                    │
                                    ▼
              [4. Bitwise VLSM Subnet Allocator (Layer 3)]
               Descending host sorting, zero overlap, RFC 3021 /31
                                    │
                                    ▼
              [5. Layer 3 Routing & Policy Planner]
               Single-Area OSPF Area 0, Multi-Area OSPF, eBGP, DiffServ QoS
                                    │
                                    ▼
              [6. Cisco IOS Configuration Generator]
               Two-stage intermediate model -> copy-paste ready CLI
                                    │
                                    ▼
              [7. Automated Verification & Artifact Exporter]
               Consolidated Packet Tracer configs + Architecture Reports
```

---

## 🔍 Key Engineering Modules

### 1. Physical Media Engine (L1 Physics)
- **IEEE 802.3 Standard Boundaries:**
  - `Run ≤ 100m`: Selects **Cat6a U/FTP (10GBASE-T)** based on IEEE 802.3an copper channel limits.
  - `Run 101–400m`: Selects **OM4 MMF (10GBASE-SR)** with 850nm VCSEL modal dispersion rationale ($4700\,\text{MHz}\cdot\text{km}$).
  - `Run > 400m`: Selects **OS2 SMF (10GBASE-LR/ER)** with single-mode attenuation budget rationale ($0.4\,\text{dB/km}$).
- **Fail-Closed Boundary Enforcement:** Copper requests exceeding 100m trigger an immediate `PhysicalDistanceViolationError` with a signal attenuation warning.

### 2. Bitwise VLSM Subnet Engine (L3)
- Pure bitwise arithmetic without third-party subnetting dependencies.
- Subnets are sorted in strict descending order of host requirements to eliminate address fragmentation.
- Implements **RFC 3021 (`/31` subnets)** for point-to-point links (2 usable IPs, 0 address wastage).
- Calculates exact network addresses, subnet masks, Cisco wildcard masks, default gateways, and broadcast boundaries.
- Proven non-overlapping through pairwise disjointness boundary checks.

### 3. Layer 3 Routing & Traffic Engineering
- **OSPF Area 0:** Configured for single autonomous system campus networks (< 50 subnets) for fast Dijkstra SPF convergence.
- **Multi-Area OSPF:** Deployed in multi-site environments to isolate link flaps from the central core.
- **eBGP Peering:** Interconnects autonomous systems (e.g. enterprise AS 65001 to cloud VPC AS 64512) with supernet route summarization (`summary-only`).
- **DiffServ QoS:** Implements RFC 4594 4-class queuing (EF Voice 30% priority queue, AF31 Transactional 40% bandwidth queue).

### 4. Self-Explaining Architecture Reports
For every decision made, the engine records an engineering justification citing IEEE standards and IETF RFCs (**RFC 950, RFC 2328, RFC 3021, RFC 4594, IEEE 802.1w, IEEE 802.3an/ae**).

---

## 🚀 Quick Start & Running the Tool

### Prerequisites
- **Node.js:** `>= 20.0.0`
- **npm:** `>= 9.0.0`

### Installation
```bash
git clone https://github.com/vanshkhurana05/NetArchitect.git
cd NetArchitect
npm install
```

### Running Presets via CLI
```bash
# Run Campus LAN Preset (3 Buildings, 1,600 endpoints, RSTP, Single-Area OSPF)
npm run design:campus

# Run Metro MAN Preset (HQ + 2 Remote sites, EVPL, QoS, Failover)
npm run design:metro

# Run Global WAN Preset (4 Cities + Cloud VPC, IPsec, eBGP, Summarization)
npm run design:global

# Or run all three presets in sequence
npm run design:all
```

### Running a Custom Network Scenario
You can supply any custom JSON file matching the schema:
```bash
# Run custom university campus scenario (10.100.0.0/16)
npx tsx src/orchestrator/cli.ts run --input presets/custom-campus.json --out outputs

# Validate input syntax before running
npx tsx src/orchestrator/cli.ts validate --input presets/custom-campus.json
```

### Where to Find Generated Files
- **Verification Exports (Deliverable 3):** Clean, consolidated configuration files ready for Cisco Packet Tracer or GNS3 are located in `exports/`:
  - `exports/campus-lan/campus-lan.cfg` (Single file containing all Campus switch configs)
  - `exports/metro-man/metro-man.cfg` (Single file containing all Metro router/switch configs)
  - `exports/global-wan/global-wan.cfg` (Single file containing all WAN router configs)
  - `exports/custom/custom.cfg` (Consolidated custom scenario configuration)
- **Detailed Artifacts:** Full reports, JSON topology graphs, and individual `.cfg` files are exported to `outputs/<scenario>/`.

---

## 🧪 Testing & Quality Assurance

NetArchitect includes an automated test suite with **184 unit and integration tests across 23 test suites**:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run strict TypeScript typecheck
npm run typecheck
```

### Test Highlights
- `tests/unit/media/engine.test.ts` (25 tests): IEEE 802.3 reach rules, optical power budgets, and copper distance violations.
- `tests/unit/vlsm/allocator.test.ts` (21 tests): Descending VLSM, zero overlap, RFC 3021 `/31` math, address space exhaustion.
- `tests/unit/configuration/golden.test.ts` (15 tests): Cisco Catalyst 2960/3560 and ISR 4331 golden config assertions.
- `tests/integration/pipeline.test.ts` (3 tests): Full end-to-end integration across all presets.

---

## 📋 Deliverables & Rubric Checklist

| Rubric Item | Points | Location in Repository | Notes |
|---|---|---|---|
| **1. Parameter Engine & Presets** | 15 Pts | `presets/`, `src/validation/`, `tests/validation.test.ts` | Implements 3 presets + custom JSON validation. Catches distance and CIDR boundary errors. |
| **2. Explainable Decision Engine** | 25 Pts | `src/explainability/`, `outputs/*/architecture-report.md` | Provides natural-language engineering rationales citing IEEE and RFC standards for all choices. |
| **3. Subnet Engine & Configs** | 25 Pts | `src/engines/vlsm/`, `src/configuration/`, `exports/` | Bitwise VLSM with zero overlap. Clean, copy-paste ready Cisco IOS configurations. |
| **4. Automated Unit Testing** | 15 Pts | `tests/unit/`, `tests/integration/` | 184 tests covering distance violations, address exhaustion, and wildcard calculations. |
| **5. AI Code Audit & Defense Log** | 20 Pts | [`ai_audit_log.md`](./ai_audit_log.md) | Technical post-mortem of real AI hallucinations, packet-flow impact, and remediations. |
| **Total** | **100 Pts** | | **100% Complete & Submission Ready** |

---

## 🛡️ AI Code Audit & Defense Log

As mandated by **Section 4 & Rubric 5**, [`ai_audit_log.md`](./ai_audit_log.md) documents concrete instances where Generative AI proposed flawed networking logic, detailing diagnosis, packet-flow consequences, and remediation:

1. **Incident 1 — Upward Prefix Scan Hallucination in Bitwise VLSM Allocator:**  
   AI suggested scanning prefix length upward starting at $p = 0$. Because smaller prefix numbers represent larger networks, any host request matched on the very first iteration ($p = 0$), assigning `/0` (the entire IPv4 space) to the first subnet and crashing the allocator. Remediated with downward scans and bitwise boundary alignment.
2. **Incident 2 — Escaped Newlines and Unconstrained Switchport Trunks:**  
   AI emitted double-escaped `\\n` sequences that created unparseable single-line config files, while omitting `switchport trunk allowed vlan` and leaving default `native vlan 1`. Remediated with clean linefeeds, strict allowed-VLAN pruning, and isolated `native vlan 99`.
3. **Incident 3 — Blind 400m Optical Reach Assumption on Multimode Fiber:**  
   AI assumed OM4 reaches 400m at any transmission speed. Remediated by factoring in modal dispersion limits (e.g. 150m at 40GBASE-SR4) and enforcing strict optical power budgets.

---

## 💻 Packet Tracer Simulation & Verification

All generated configuration files in `exports/` use verified Cisco IOS syntax compatible with standard Cisco hardware in Packet Tracer and GNS3:
- **Core Switches:** Cisco Catalyst 3560 / 3650 (`ip routing`, Rapid-PVST priority 4096, SVIs, OSPF Area 0).
- **Access Switches:** Cisco Catalyst 2960 (RSTP edge portfast, BPDU guard, 802.1Q dot1q trunks, native VLAN 99).
- **Routers:** Cisco ISR 4331 / ISR 2911 (BGP peering, IPsec IKEv2 tunnels, DiffServ QoS policy-maps).

Refer to [`docs/VERIFICATION.md`](./docs/VERIFICATION.md) for detailed verification commands (`show interfaces trunk`, `show spanning-tree`, `show ip ospf neighbor`, `show ip route`) and testing matrices.
