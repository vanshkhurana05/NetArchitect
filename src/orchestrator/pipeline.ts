/**
 * Master Application Pipeline & Orchestrator.
 * Wires the 10 processing engines in strict dependency order without circular coupling.
 * Enforces fail-closed verification gating before filesystem export.
 */
import type { ValidatedRun } from "../contracts/input.js";
import type { RunReport, RunOptions, PipelineStage } from "../contracts/orchestrator.js";
import type { TopologyRequest } from "../contracts/topology.js";
import { buildTopology } from "../engines/topology/index.js";
import { planVlans, deriveVlsmRequests } from "../engines/vlan/index.js";
import { allocateVlsm } from "../engines/vlsm/index.js";
import { planRouting } from "../engines/routing/index.js";
import { createConfigGenerator } from "../configuration/index.js";
import { createVerificationService } from "../verification/index.js";
import { createDecisionCollector } from "../explainability/index.js";
import { generateMarkdownReport } from "../exporters/report.exporter.js";
import { exportDesignArtifacts } from "../exporters/artifact.exporter.js";

/** Map full profile name to directory key */
function toScenarioKey(profile: string, source?: string): "campus" | "metro" | "global" | string {
  if (source === "custom") return "custom";
  if (profile === "campus-lan") return "campus";
  if (profile === "metro-man") return "metro";
  if (profile === "global-wan") return "global";
  return profile;
}

/**
 * Executes the complete NetArchitect pipeline end-to-end.
 */
export async function runNetArch(
  runInput: ValidatedRun,
  opts?: RunOptions,
): Promise<RunReport> {
  const rawInput = runInput.input as any;
  const profile = rawInput.profile;
  const scenarioKey = toScenarioKey(profile, runInput.source);
  const outDir = opts?.outDir ?? "outputs";

  const stages: PipelineStage[] = [];
  const rejections: Array<{ stage: string; code: string; message: string }> = [];
  const collector = createDecisionCollector();

  async function measureStage<T>(
    name: string,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    const start = performance.now();
    try {
      const res = await fn();
      const elapsed = Math.round(performance.now() - start);
      stages.push({ name, millis: elapsed, ok: true });
      return res;
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      stages.push({ name, millis: elapsed, ok: false });
      rejections.push({
        stage: name,
        code: err.code ?? "ENGINE_ERROR",
        message: err.message ?? String(err),
      });
      throw err;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // Stage 1: Ingestion & Validation
    // ------------------------------------------------------------------------
    await measureStage("Profile Ingestion & Validation", () => {
      if (runInput.advisories && runInput.advisories.length > 0) {
        // Log advisories if any
      }
      return true;
    });

    // ------------------------------------------------------------------------
    // Stage 2 & 3: Media Recommendation & Topology Construction
    // ------------------------------------------------------------------------
    const topo = await measureStage("Topology Construction", () => {
      const topoRequest: TopologyRequest = {
        profileShape: {
          profile,
          ...(profile === "campus-lan" && {
            buildings: rawInput.buildings,
            collapsedCore: rawInput.collapsedCore,
            representativeAccess: opts?.representative ?? rawInput.representativeAccess,
          }),
          ...(profile === "metro-man" && { sites: rawInput.sites, dualHomedFailover: rawInput.dualHomedFailover, evplBandwidthMbps: rawInput.evplBandwidthMbps }),
          ...(profile === "global-wan" && { cities: rawInput.cities, cloudVpc: rawInput.cloudVpc }),
        } as any,
        mediaByRole: new Map(),
      };
      const builtTopo = buildTopology(topoRequest, {
        representativeAccess: opts?.representative ?? rawInput.representativeAccess,
      });
      collector.ingestExplainRecords(builtTopo.explanations);
      return builtTopo;
    });

    // ------------------------------------------------------------------------
    // Stage 4: VLAN Planning
    // ------------------------------------------------------------------------
    const vlans = await measureStage("VLAN Planning", () => {
      const siteIds =
        profile === "campus-lan"
          ? rawInput.buildings.map((b: any) => b.id)
          : profile === "metro-man"
            ? rawInput.sites.map((s: any) => s.id)
            : rawInput.cities.map((c: any) => c.id);

      const plan = planVlans({
        requests: rawInput.vlanRequests,
        siteIds,
        devices: topo.devices,
        links: topo.links,
      });
      collector.ingestExplainRecords(plan.vlanPlan.explanations);
      return plan;
    });

    // ------------------------------------------------------------------------
    // Stage 5: VLSM Allocation
    // ------------------------------------------------------------------------
    const vlsm = await measureStage("Bitwise VLSM Allocation", () => {
      const vlsmReqs = deriveVlsmRequests(vlans.vlanPlan.items, rawInput.vlanRequests);
      const plan = allocateVlsm(rawInput.rootBlockCidr, vlsmReqs);
      collector.ingestExplainRecords(plan.explanations);
      return plan;
    });

    // ------------------------------------------------------------------------
    // Stage 6: Layer 3 Routing Planning
    // ------------------------------------------------------------------------
    const routing = await measureStage("Layer 3 Routing Planning", () => {
      const plan = planRouting({
        profile,
        asNumber: 65001,
        sites: topo.sites,
        devices: topo.devices,
        subnets: vlsm.subnets,
        ...(profile === "metro-man" && { qosClasses: rawInput.qosClasses, links: topo.links, evplBandwidthMbps: rawInput.evplBandwidthMbps }),
        ...(profile === "global-wan" && { cloudVpc: rawInput.cloudVpc, links: topo.links }),
      });
      collector.ingestExplainRecords(plan.explanations);
      return plan;
    });

    // ------------------------------------------------------------------------
    // Stage 7: Cisco Configuration Generation (Stage 1 IR + Stage 2 Renderer)
    // ------------------------------------------------------------------------
    const configResult = await measureStage("Cisco Configuration Generation", () => {
      const generator = createConfigGenerator();
      return generator.generate({
        name: scenarioKey,
        devices: topo.devices,
        links: topo.links,
        vlanPlan: vlans.vlanPlan,
        subnets: vlsm.subnets,
        routing,
      });
    });

    // ------------------------------------------------------------------------
    // Stage 8: Fail-Closed Invariant Verification
    // ------------------------------------------------------------------------
    const verification = await measureStage("Invariant Verification", () => {
      const verifier = createVerificationService();
      const report = verifier.verify({
        subject: scenarioKey,
        subnets: vlsm.subnets,
        vlanIds: vlans.vlanPlan.items.map((v) => v.vlanId),
        devices: topo.devices,
        links: topo.links,
        routing,
        rootBlockCidr: rawInput.rootBlockCidr,
        latencyTargetMs: rawInput.latencyTargetMs,
      });

      if (!report.passed) {
        const failures = report.checks.filter((c) => !c.passed).map((c) => `[${c.id}] ${c.detail}`).join("; ");
        throw new Error(`Verification Gate Failed: ${failures}`);
      }

      return report;
    });

    // ------------------------------------------------------------------------
    // Stage 9: Artifact Export
    // ------------------------------------------------------------------------
    let exportManifest: any;
    if (opts?.dryRun !== true) {
      exportManifest = await measureStage("Filesystem Export", () => {
        const reportMd = generateMarkdownReport({
          scenarioName: `${scenarioKey.toUpperCase()} Design Report`,
          profileKind: profile,
          source: runInput.source,
          rawInput,
          topology: topo,
          vlanPlan: vlans.vlanPlan,
          vlsmPlan: vlsm,
          routingPlan: routing,
          deviceConfigs: configResult.configs,
          decisions: collector.getDecisions(),
          verificationStatus: verification,
        });

        const designJson = {
          profile,
          source: runInput.source,
          topology: topo,
          vlans: vlans.vlanPlan,
          subnets: vlsm.subnets,
          routing,
          verification,
        };

        const exportRes = exportDesignArtifacts({
          scenarioKey,
          source: runInput.source,
          outDir,
          networkDesignJson: designJson,
          architectureReportMd: reportMd,
          decisionLogJson: collector.getDecisions(),
          vlsmAllocationJson: vlsm,
          deviceConfigs: configResult.configs,
        });

        return exportRes.manifest;
      });
    }

    return {
      scenario: scenarioKey,
      input: runInput,
      topology: topo,
      vlanPlan: vlans.vlanPlan,
      vlsm,
      routing,
      configs: configResult.configs,
      verification,
      explainLog: collector.toExplainLog(),
      stages,
      exports: exportManifest,
      rejections,
    };
  } catch (error: any) {
    return {
      scenario: scenarioKey,
      input: runInput,
      explainLog: collector.toExplainLog(),
      stages,
      rejections,
    };
  }
}
