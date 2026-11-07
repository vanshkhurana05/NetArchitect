# NetArchitect — Data Contracts (v1.2)

**The code is the contract.** This file indexes it; `src/contracts/index.ts` is the load-bearing
source of truth. Any mismatch between docs and code is resolved in favour of a contract change
request to the Lead Architect, followed by a documentation update.

---

## 1. Input Domain (`src/contracts/input.ts`)
| Type | Purpose | Key Constraints |
|---|---|---|
| `CampusLanInput` | 3 buildings, VLANs, root block, collapsed core, single-area OSPF | `buildings.length === 3`, `backboneRunMeters <= 400`, `accessRunMeters <= 100` |
| `MetroManInput` | HQ + remotes, EVPL bandwidth, 5 ms target, QoS classes, dual-homing | `sites.length >= 3`, `distanceKm` 15..35 km, `latencyTargetMs <= 10` |
| `GlobalWanInput` | 4+ cities + AWS/Azure/GCP Cloud VPC, IKEv2, multi-area OSPF, eBGP, summarization | `cities.length >= 4`, canonical `cloudVpc` block |
| `NetArchInput` | Discriminated union of all 3 scenario inputs | Single ingest entrypoint for validator |
| `VlanRequest` | Name, purpose, and requested host capacity | Shared across all profiles |
| `ValidatedRun` | Ingest output envelope with validated input + non-fatal advisories | Produced by `ValidateInput` |

---

## 2. Intermediate Engine Models
| Contract Type | Defined In | Producer Engine | Downstream Consumers |
|---|---|---|---|
| `MediaRecommendation`, `TransceiverSpec`, `MediaQuery` | `media.ts` | Media Engine | Topology, ConfigGen, Verify, Explain |
| `Topology`, `Device`, `Link`, `Site`, `ProfileShape` | `topology.ts` | Topology Engine | VLAN, VLSM, Routing, ConfigGen, Verify |
| `VlanPlan`, `VlanItem`, `TrunkPlan` | `vlan.ts` | VLAN Engine | VLSM, ConfigGen, Verify |
| `VlsmPlan`, `SubnetPlanItem`, `VlsmRequest` | `vlsm.ts` | VLSM Engine | Routing, ConfigGen, Verify, Export |
| `RoutingPlan`, `OspfAreaPlan`, `BgpSession`, `VpnTunnel`, `QosPolicyClass` | `routing.ts` | Routing Engine | ConfigGen, Verify, Export |
| `ConfigBundleInput`, `DeviceConfig`, `ConfigGenResult` | `config.ts` | Config Generator | Export Manager, Orchestrator |
| `VerificationReport`, `VerificationCheck`, `VerificationInput` | `verification.ts` | Verification Engine | Export Manager (fail-closed gate) |
| `ExplainRecord`, `ExplainLog`, `ExplainCollector` | `explain.ts` | All Engines | Export Manager (Report & Log) |
| `ExportManifest`, `ExportBundle`, `ExportDirectoryLayout` | `export.ts` | Export Manager | Application Orchestrator, CLI |
| `RunReport`, `RunOptions`, `PipelineStage` | `orchestrator.ts` | Orchestrator | CLI, Integration Tests |

---

## 3. Error Taxonomy (`src/contracts/errors.ts`)
- `NetArchError`: Base class for all domain errors.
- `ValidationError`: Zod validation errors on ingest.
- `PhysicalDistanceViolationError`: **Assignment-mandated name**. Raised when copper is requested for a run > 100 m (IEEE 802.3an limit).
- `AddressSpaceExhaustedError`: Raised when the root block cannot fit requested subnets.
- `SubnetOverlapError`: Internal invariant violation when carved subnets overlap.
- `ReachabilityError`: Raised when a run distance exceeds maximum supported standard reach (40 km).

---

## 4. Domain-Alias Mapping (`src/domain/`)
The required domain vocabulary maps 1:1 to frozen contracts (no duplication):

| Domain Model Name | Contract Type |
|---|---|
| `NetworkRequirements` | `NetArchInput` |
| `RequirementsEnvelope` | `ValidatedRun` |
| `NetworkDesign` | Aggregate design envelope (`Site`, `Device`, `NetworkLink`, `VLAN`, `SubnetAllocation`, `RoutingPlan`, etc.) |
| `NetworkLink` | `Link` |
| `VLAN` | `VlanItem` |
| `SubnetRequest` | `VlsmRequest` |
| `SubnetAllocation` | `SubnetPlanItem` |
| `RoutingDomain` | `OspfAreaPlan` |
| `NetworkDecision` | `ExplainRecord` |
| `DeviceConfiguration` | `DeviceConfig` |
| `InputSource` | `InputSourceKind` |

---

## 5. Contract Amendments Log (Architect-Approved)
- **A+1:** Added paired type exports for enum constants (`InputSourceKind`, `QosClassKind`).
- **A+2:** Added optional `iotNodes` to `cloudVpc` in `GlobalWanInput` for cloud IoT device accounting.
- **A+3:** Added `gateway: string` to `SubnetPlanItem` representing the first usable host.
- **A+4:** Added `totalAddresses: number` to `SubnetPlanItem` ($2^{32-prefix}$; /31 $\rightarrow$ 2, /32 $\rightarrow$ 1).
- **A+5:** Added `linkId`, `requiredBandwidthGbps`, and `requestedTransceiver` to `MediaQuery`.
- **A+6:** Added `rationale`, `warnings`, `compatibilityIssues`, and `linkId` to `MediaRecommendation`.
- **A+7:** Extended `ProfileShape` in `topology.ts` with scenario steering flags (`collapsedCore`, `dualHomedFailover`, `evplBandwidthMbps`, `cloudVpc`).
- **A+8:** Added optional `devices?: Device[]` and `links?: Link[]` to `VlanEngineInput`.
- **A+9:** Added optional `links`, `qosClasses`, `evplBandwidthMbps`, and `cloudVpc` to `RoutingEngineInput`.
- **A+10:** Added optional `latencyTargetMs` and `rootBlockCidr` to `VerificationInput`.

---

## 6. Change Policy & Protocol
1. Specialist agent requests an amendment with proposed signature diff and rationale.
2. Lead Architect evaluates blast radius across all 10 modules and the assignment rubric.
3. If approved, Lead Architect updates `src/contracts/` in a single commit and increments contract version.
4. Fixtures (`presets/`) and existing tests are updated in the same commit.
5. Dependent agents receive the updated contracts before implementing dependent features.
