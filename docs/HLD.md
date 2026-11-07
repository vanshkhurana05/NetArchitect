# NetArchitect — High-Level Design (HLD)

## Mission
A modular monolithic TypeScript application that ingests preset or custom network parameters,
executes algorithmic rule engines (L1 media physics → topology → VLAN/IP → routing), and emits
structured recommendations, **natural-language engineering justifications for every decision**,
and deployment-ready Cisco IOS configurations compatible with Cisco Packet Tracer and GNS3.

## Supported Network Scenarios
1. **Campus LAN:** 3 buildings, 1,600 endpoints, Cat6a/MMF, 802.1Q VLANs, RSTP, single-area OSPF (Area 0).
2. **Metro MAN:** HQ + 2 remote sites (15–35 km), 450 users, OS2 SMF, EVPL, sub-5ms target, QoS classes, dual-homed failover.
3. **Global WAN:** 4 cities + Cloud VPC, 2,000 IoT/scanner nodes, IPsec VPN (IKEv2), multi-area OSPF/BGP, and route summarization.

## Composition Flow (Orchestrator-Owned)
```
ValidatedRun (Zod Profile & Input Validation)
   │
   ▼
MediaEngine (L1 Physics: Cat6a / OM4 / OS2 Rules, Threshold Checks, Distance Violation Detection)
   │
   ▼
TopologyEngine (Sites, Tiers, Roles, Inter-Tier & Backbone Links; Consumes Media Choices)
   │
   ▼
VlanEngine (802.1Q VLAN ID Allocation, Trunk Allowed Lists, Native VLAN Hardening, SVI Plan)
   │
   ▼
VlsmEngine (Bitwise Descending-Sort Allocator, RFC 3021 /31 & /32 Support, Gateway Reservation, Zero-Overlap)
   │
   ▼
RoutingEngine (Protocol Selector: Single-Area OSPF vs Multi-Area OSPF + eBGP Peering, IPsec VPN, QoS Classes)
   │
   ▼
ConfigGenerator (Cisco IOS-XE Syntax: Hostnames, VLAN DB, Trunks, SVIs, OSPF, BGP, Crypto/IPsec, QoS ACLs)
   │
   ▼
VerificationEngine (Fail-Closed Verification: Overlap Invariant, Capacity, Wildcard Recomputation, Media, Latency)
   │
   ▼
ExportManager (Artifacts: exports/<scenario>/*.ios, report.md, design.json, verification.md, explain-log.json)
```

Every engine pushes `ExplainRecord`s into a shared `ExplainCollector`. The report renderer
serialises the whole rationale chain. Verification failure **blocks export** (fail-closed gate).

## Pipeline Invariants
1. Interfaces between stages are the Zod/TS contracts in `src/contracts/` — nothing else.
2. Engine order is fixed; no engine may call another engine directly (the orchestrator passes data).
3. Rejections (e.g. `PhysicalDistanceViolationError`, `ReachabilityError`, `AddressSpaceExhaustedError`)
   surface in `RunReport.rejections` with code + message, never silent drops.
4. `main` must `typecheck && test && run examples` at every integration point.

## Repository Layout
```
NetArchitect/
├─ src/contracts/        # ARCHITECT-OWNED shared domain models (frozen contracts v1.2)
├─ src/domain/           # Typed aliases mapping domain vocabulary to frozen contracts
├─ src/profiles/         # Preset loader (presets/*.json) and documented defaults
├─ src/validation/       # Zod schemas + semantic link & capacity checks
├─ src/explain/          # Shared ExplainCollector (in-memory log + Markdown renderer)
├─ src/engines/
│  ├─ media/             # L1 physics rule table & transceiver catalog (Cat6a/OM4/OS2)
│  ├─ vlsm/              # Deterministic bitwise allocator (RFC 3021 /31, /32, zero-overlap)
│  ├─ topology/          # Sites, devices, links intermediate model generator
│  ├─ vlan/              # 802.1Q VLAN numbering & trunk etiquette
│  ├─ routing/           # OSPF single/multi-area, eBGP, IPsec, and QoS marking
│  ├─ configgen/         # Cisco IOS-XE renderer (Packet Tracer compatible)
│  ├─ verify/            # V-01..V-08 boundary checks (fail-closed gate)
│  └─ export/            # ExportManager (filesystem artifact generation)
├─ src/orchestrator/     # Pipeline coordinator & CLI (netarch run/load/validate)
├─ presets/              # campus-lan.json, metro-man.json, global-wan.json
├─ examples/             # Runnable end-to-end demo scripts per module & scenario
├─ tests/                # Vitest test suites (unit, fixtures, validation, integration)
└─ docs/                 # HLD, LLD, DATA_CONTRACTS, ASSUMPTIONS, INTEGRATION_STATUS, ARCHITECTURE_DECISIONS
```

## Ownership Matrix (Strict Trunk Boundaries)
| Agent | Assigned Modules & Directories | Allowed Edits | Forbidden Edits |
|---|---|---|---|
| **Lead Architect** (Integration Lead) | `src/contracts/`, `src/orchestrator/`, `src/explain/`, `docs/`, `presets/` | All shared models, orchestration root, pipeline integration, docs, presets | Must delegate specialist engine code |
| **Agent-A** (Profiles & Validation) | `src/profiles/`, `src/validation/`, `tests/profiles.test.ts`, `tests/validation.test.ts` | Preset loading, defaults catalog, Zod validation | `src/contracts/`, other engines |
| **Agent-B** (Media Engine) | `src/engines/media/`, `tests/unit/media/` | L1 physics rules, distance thresholds, transceiver catalog | `src/contracts/`, topology, routing |
| **Agent-C** (Topology Engine) | `src/engines/topology/`, `tests/unit/topology/` | Device models, link construction, site mapping | `src/contracts/`, configgen, routing |
| **Agent-D** (VLAN & VLSM Engines) | `src/engines/vlan/`, `src/engines/vlsm/`, `tests/unit/vlsm/`, `tests/unit/vlan/` | 802.1Q plan, bitwise IP subnetting, RFC 3021 /31 math | `src/contracts/`, media, routing |
| **Agent-E** (Routing Engine) | `src/engines/routing/`, `tests/unit/routing/` | OSPF Area 0/Multi-Area, eBGP sessions, IPsec tunnels, QoS | `src/contracts/`, configgen |
| **Agent-F** (Configuration Generator) | `src/engines/configgen/`, `tests/unit/configgen/` | Cisco IOS configuration templates, PT compatibility mode | `src/contracts/`, verification |
| **Agent-G** (Verification & Export) | `src/engines/verify/`, `src/engines/export/`, `tests/unit/verify/`, `tests/unit/export/` | Boundary invariants, wildcard verification, filesystem exports | `src/contracts/`, orchestrator |

## Interface Conflict Resolution Protocol
1. **Specialist Request:** When a specialist agent determines that an existing contract cannot represent a required field or behavior, it files a contract change proposal.
2. **Impact Assessment:** Lead Architect evaluates the proposed change against the ownership matrix, existing presets, downstream consumers, and rubric requirements.
3. **Additive Preference:** Amendments are additive (optional fields, richer unions) to prevent breaking existing modules or tests.
4. **Single-Commit Update:** Lead Architect updates `src/contracts/`, increments contract version, updates `docs/DATA_CONTRACTS.md`, and notifies dependent specialist agents.
5. **Fixtures & Tests Synchronized:** Presets and integration tests are updated in the same commit to maintain a clean compilation and passing test suite.

## Integration Gates (Every PR Must Pass)
1. `npm run typecheck` (`tsc --noEmit`) passes with zero errors.
2. `npm test` (`vitest run`) passes with 100% of existing tests intact and new module tests included.
3. At least one runnable demo script under `examples/` demonstrating the feature.
4. Zero edits outside the specialist's assigned directory boundary.
5. No stub or placeholder implementations accepted as completed features.

## Packet Tracer / GNS3 Verification Approach
- Configurations are generated using clean, standard Cisco IOS-XE commands supported by Cisco Packet Tracer (e.g. 2960/3560/3650 switches and 2911/4331 routers) and GNS3.
- Advanced features like IKEv2 / EVPL sub-interfaces are designed to degrade gracefully or be configured with standard IOS equivalents in Packet Tracer compatibility mode.
- Export bundles include `.ios` configuration files ready to be pasted directly into Packet Tracer CLI prompts.
