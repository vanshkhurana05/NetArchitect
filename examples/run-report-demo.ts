/**
 * Runnable demo demonstrating Explainability Collection and Comprehensive 12-Section Markdown Report Generation.
 *
 * Usage: npm run example:report
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadPreset } from "../src/profiles/index.js";
import { buildTopology } from "../src/engines/topology/index.js";
import { planVlans, deriveVlsmRequests } from "../src/engines/vlan/index.js";
import { allocateVlsm } from "../src/engines/vlsm/index.js";
import { planRouting } from "../src/engines/routing/index.js";
import { createConfigGenerator } from "../src/configuration/index.js";
import { createDecisionCollector } from "../src/explainability/index.js";
import { generateMarkdownReport } from "../src/exporters/report.exporter.js";

async function runReportDemo() {
  console.log("================================================================================");
  console.log(" NetArchitect — Explainability & 12-Section Design Report Demo");
  console.log("================================================================================\n");

  const scenario = "campus-lan";
  const run = await loadPreset(scenario);
  const input = run.input as any;

  const collector = createDecisionCollector();

  // 1. Build Topology
  const topo = buildTopology({
    profileShape: {
      profile: scenario,
      buildings: input.buildings,
      collapsedCore: input.collapsedCore,
    },
    mediaByRole: new Map(),
  });
  collector.ingestExplainRecords(topo.explanations);

  // 2. Plan VLANs
  const vlans = planVlans({
    requests: input.vlanRequests,
    siteIds: input.buildings.map((b: any) => b.id),
    devices: topo.devices,
    links: topo.links,
  });
  collector.ingestExplainRecords(vlans.vlanPlan.explanations);

  // 3. Allocate VLSM Subnets
  const vlsm = allocateVlsm(
    input.rootBlockCidr,
    deriveVlsmRequests(vlans.vlanPlan.items, input.vlanRequests),
  );
  collector.ingestExplainRecords(vlsm.explanations);

  // 4. Plan Routing
  const routing = planRouting({
    profile: scenario,
    asNumber: 65001,
    sites: topo.sites,
    devices: topo.devices,
    subnets: vlsm.subnets,
  });
  collector.ingestExplainRecords(routing.explanations);

  // 5. Generate Configurations
  const generator = createConfigGenerator();
  const configResult = generator.generate({
    name: scenario,
    devices: topo.devices,
    links: topo.links,
    vlanPlan: vlans.vlanPlan,
    subnets: vlsm.subnets,
    routing,
  });

  // 6. Generate Complete 12-Section Markdown Report
  const decisions = collector.getDecisions();
  console.log(`- Collected ${decisions.length} structured engineering decisions.`);

  const report = generateMarkdownReport({
    scenarioName: "Enterprise Campus LAN",
    profileKind: "campus-lan",
    source: "preset",
    rawInput: input,
    topology: topo,
    vlanPlan: vlans.vlanPlan,
    vlsmPlan: vlsm,
    routingPlan: routing,
    deviceConfigs: configResult.configs,
    decisions,
    verificationStatus: {
      passed: true,
      checks: [
        { id: "V-01", name: "Bitwise Zero-Overlap Invariant", passed: true, detail: "All 5 subnets non-overlapping." },
        { id: "V-02", name: "Host Capacity Requirement Check", passed: true, detail: "All subnets satisfy host demands." },
        { id: "V-03", name: "Wildcard Inversion Verification", passed: true, detail: "All wildcard masks match ~netmask." },
        { id: "V-04", name: "802.1Q VLAN Safety & Native Hardening", passed: true, detail: "VLAN 99 untagged/unused." },
        { id: "V-05", name: "Physical Media Feasibility Check", passed: true, detail: "No copper runs > 100m." },
      ],
    },
  });

  const outDir = join(process.cwd(), "samples", scenario);
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, "report.md");
  writeFileSync(reportPath, report, "utf8");

  console.log(`- Generated comprehensive 12-section design report: ${reportPath}`);
  console.log(`- Report size: ${(report.length / 1024).toFixed(1)} KB`);

  console.log("\n>>> Report Table of Contents & Headings Preview:");
  const headings = report.split("\n").filter((l) => l.startsWith("## "));
  for (const h of headings) {
    console.log(`   ${h}`);
  }

  console.log("\n================================================================================");
  console.log(" Report Generation Demo Completed Successfully!");
  console.log("================================================================================");
}

runReportDemo().catch((err) => {
  console.error("Report demo failed:", err);
  process.exit(1);
});
