# NetArchitect — Integration Status

Updated at every integration. `main` is always required to typecheck + test + run examples.

## Current state: ARCHITECTURAL FOUNDATION & WAVE-1 PROGRESS (Contracts v1.2 / 103 tests passing)
- [x] Repository scaffold (package.json, tsconfig, vitest, gitignore)
- [x] Shared contracts authored and typechecking (`src/contracts/*`) — v1.2 (Amendments A+1 through A+10)
- [x] Three preset fixtures authored (`presets/*.json`) — canonicalized schemas
- [x] Domain models + enums as typed aliases (`src/domain/{models,enums}`)
- [x] Profiles: loader (preset + custom), catalog, documented defaults (`src/profiles`)
- [x] Validation: Zod schemas + semantic link & capacity checks (`src/validation`)
- [x] VLSM engine: bitwise allocator, RFC 3021 /31, /32, gateway reservation (`src/engines/vlsm`)
- [x] Media engine: distance-policy & transceiver catalog split, threshold-exact boundary enforcement (`src/engines/media`)
- [x] Explainability engine: in-memory ExplainCollector & Markdown renderer (`src/explain`)
- [x] 103 tests passing across 6 test suites; `example:profiles`, `example:vlsm`, `example:media` runnable
- [x] HLD, LLD, DATA_CONTRACTS, ASSUMPTIONS, DECISION, FLOW, INTEGRATION_STATUS, ARCHITECTURE_DECISIONS
- [ ] Specialist wave-1 completion (topology / vlan / routing)
- [ ] Config generation (Packet Tracer compatible Cisco IOS templates)
- [ ] Verification engine (fail-closed V-01..V-08 checks) + filesystem export manager
- [ ] End-to-end Application Orchestrator & CLI (`netarch`)
- [ ] GNS3/Packet Tracer evidence for 3 scenarios
- [ ] `ai_audit_log.md` (documented real AI networking flaws + technical defense)

## Module status board
| Module | Directory | Owner | Status | Tests | Example / Run Target |
|---|---|---|---|---|---|
| contracts | `src/contracts/` | Lead Architect | **done** (v1.2 — amendments A+1 through A+10) | Typechecked across all consumers | — |
| domain models | `src/domain/` | Foundation / Profiles agent | **done** — typed aliases + DeviceInterface/NetworkDesign | Alias honesty tests in profiles | `examples/run-profiles-demo.ts` |
| profiles | `src/profiles/` | Profiles specialist (Agent-A) | **done** — loader + defaults + catalog | 15 tests (`tests/profiles.test.ts`) | `examples/run-profiles-demo.ts` |
| validation | `src/validation/` | Profiles specialist (Agent-A) | **done** — Zod schemas + capacity/link checks | 26 tests (`tests/validation.test.ts`) | `examples/run-profiles-demo.ts` |
| vlsm | `src/engines/vlsm/` | VLSM specialist (Agent-D) | **done** — deterministic bitwise allocator, RFC 3021 /31, gateway reservation | 34 tests (`tests/unit/vlsm/`) | `examples/run-vlsm-demo.ts` |
| media | `src/engines/media/` | Media specialist (Agent-B) | **done** — L1 physics rules table + transceiver catalog | 25 tests (`tests/unit/media/`) | `examples/run-media-demo.ts` |
| explain | `src/explain/` | Lead Architect / Explain specialist | **done** — in-memory log collector + Markdown renderer | 3 tests (`tests/unit/explain/`) | Used by media & vlsm demos |
| topology | `src/engines/topology/` | Topology specialist (Agent-C) | pending | To be integrated in next wave | `examples/run-topology-demo.ts` |
| vlan | `src/engines/vlan/` | VLAN specialist (Agent-D) | pending | To be integrated in next wave | `examples/run-vlan-demo.ts` |
| routing | `src/engines/routing/` | Routing specialist (Agent-E) | pending | To be integrated in next wave | `examples/run-routing-demo.ts` |
| configgen | `src/engines/configgen/` | ConfigGen specialist (Agent-F) | pending | To be integrated in next wave | Device config demos |
| verify | `src/engines/verify/` | Verification specialist (Agent-G) | pending | To be integrated in next wave | V-01..V-08 test suite |
| export | `src/engines/export/` | Export specialist (Agent-G) | pending | To be integrated in next wave | Filesystem export test |
| orchestrator | `src/orchestrator/` | Lead Architect | pending | Integration test suite | CLI `netarch` |

## Integration gates (every PR must pass)
1. `npm run typecheck` clean (`tsc --noEmit`).
2. `npm test` (`vitest run`) — 100% of existing tests pass, new module tests included.
3. At least one runnable example under `examples/`.
4. Strict adherence to module ownership boundaries (no unauthorized directory edits).
5. No placeholder implementations accepted as completed features.

## Known interface risks to resolve before merge
| Risk | Mitigation |
|---|---|
| Topology types vs media output shape drift | contracts emit `ImportEnvelope` structurally identical to `MediaRecommendation` |
| Wildcard-mask recomputation divergence | verify agent recomputes independently; disagreement = test failure, not silent pass |
| PT/GNS3 command coverage | configgen emits only commands verified parseable; exotic IOS guarded behind flags |
