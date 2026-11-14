/**
 * Artifact Exporter.
 * Persists complete design deliverables to the filesystem:
 * outputs/<scenario>/
 *  ├── network-design.json
 *  ├── architecture-report.md
 *  ├── decision-log.json
 *  ├── vlsm-allocation.json
 *  └── configurations/*.cfg
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ExportManifest, ExportedArtifact } from "../contracts/export.js";
import type { DeviceConfig } from "../contracts/config.js";

export interface ArtifactExportInput {
  scenarioKey: "campus" | "metro" | "global" | string;
  source: "preset" | "custom";
  outDir?: string;
  networkDesignJson: unknown;
  architectureReportMd: string;
  decisionLogJson: unknown;
  vlsmAllocationJson: unknown;
  deviceConfigs: DeviceConfig[];
}

export interface ArtifactExportResult {
  outputDirectory: string;
  manifest: ExportManifest;
}

function toCanonicalPreset(scenarioKey: string): string {
  if (scenarioKey === "campus") return "campus-lan";
  if (scenarioKey === "metro") return "metro-man";
  if (scenarioKey === "global") return "global-wan";
  return scenarioKey;
}

function buildConsolidatedConfig(scenarioKey: string, configs: DeviceConfig[]): string {
  const lines: string[] = [
    `! ==============================================================================`,
    `! NetArchitect — Consolidated Cisco IOS Configuration File`,
    `! Profile: ${scenarioKey.toUpperCase()} (Packet Tracer / GNS3 Verification Export)`,
    `! Generated: ${new Date().toISOString()}`,
    `! Total Managed Devices: ${configs.length}`,
    `! ==============================================================================`,
    `!`,
    `! DEPLOYMENT INSTRUCTIONS FOR CISCO PACKET TRACER / GNS3:`,
    `! 1. Open the scenario workspace canvas.`,
    `! 2. For each device section below, click the device, select the CLI tab.`,
    `! 3. Enter privileged exec & global configuration mode:`,
    `!      enable`,
    `!      configure terminal`,
    `! 4. Copy-paste the corresponding device block below.`,
    `! ==============================================================================`,
    ``,
  ];

  for (const cfg of configs) {
    lines.push(`! ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);
    lines.push(`! BEGIN CONFIGURATION: ${cfg.deviceId}`);
    lines.push(`! ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`);
    lines.push(cfg.lines.join("\n"));
    lines.push(`!`);
    lines.push(`! END CONFIGURATION: ${cfg.deviceId}`);
    lines.push(`! ==============================================================================`);
    lines.push(``);
  }

  return lines.join("\n");
}

export function exportDesignArtifacts(input: ArtifactExportInput): ArtifactExportResult {
  const baseOut = input.outDir ?? "outputs";
  const scenarioDir = join(baseOut, input.scenarioKey);
  const configsDir = join(scenarioDir, "configurations");

  mkdirSync(scenarioDir, { recursive: true });
  if (existsSync(configsDir)) {
    rmSync(configsDir, { recursive: true, force: true });
  }
  mkdirSync(configsDir, { recursive: true });

  const artifacts: ExportedArtifact[] = [];

  // 1. network-design.json
  const designPath = join(scenarioDir, "network-design.json");
  const designStr = JSON.stringify(input.networkDesignJson, null, 2);
  writeFileSync(designPath, designStr, "utf8");
  artifacts.push({
    path: designPath,
    kind: "json-design",
    bytes: Buffer.byteLength(designStr, "utf8"),
  });

  // 2. architecture-report.md
  const reportPath = join(scenarioDir, "architecture-report.md");
  writeFileSync(reportPath, input.architectureReportMd, "utf8");
  artifacts.push({
    path: reportPath,
    kind: "markdown-report",
    bytes: Buffer.byteLength(input.architectureReportMd, "utf8"),
  });

  // 3. decision-log.json
  const decisionPath = join(scenarioDir, "decision-log.json");
  const decisionStr = JSON.stringify(input.decisionLogJson, null, 2);
  writeFileSync(decisionPath, decisionStr, "utf8");
  artifacts.push({
    path: decisionPath,
    kind: "explain-log",
    bytes: Buffer.byteLength(decisionStr, "utf8"),
  });

  // 4. vlsm-allocation.json
  const vlsmPath = join(scenarioDir, "vlsm-allocation.json");
  const vlsmStr = JSON.stringify(input.vlsmAllocationJson, null, 2);
  writeFileSync(vlsmPath, vlsmStr, "utf8");
  artifacts.push({
    path: vlsmPath,
    kind: "json-design",
    bytes: Buffer.byteLength(vlsmStr, "utf8"),
  });

  // 5. configurations/*.cfg (Individual device configs)
  for (const cfg of input.deviceConfigs) {
    const cfgPath = join(configsDir, `${cfg.deviceId}.cfg`);
    const content = cfg.lines.join("\n");
    writeFileSync(cfgPath, content, "utf8");
    artifacts.push({
      path: cfgPath,
      kind: "ios-config",
      bytes: Buffer.byteLength(content, "utf8"),
    });
  }

  // 6. Consolidated all-in-one configuration file
  const consolidatedContent = buildConsolidatedConfig(input.scenarioKey, input.deviceConfigs);
  const consolidatedPath = join(scenarioDir, `${input.scenarioKey}.cfg`);
  writeFileSync(consolidatedPath, consolidatedContent, "utf8");
  artifacts.push({
    path: consolidatedPath,
    kind: "ios-config",
    bytes: Buffer.byteLength(consolidatedContent, "utf8"),
  });

  // 7. Mirror Deliverable 3 verification exports to exports/<preset>/
  const canonicalPreset = toCanonicalPreset(input.scenarioKey);
  const exportPresetDir = join("exports", canonicalPreset);
  const exportConfigsDir = join(exportPresetDir, "configurations");
  try {
    mkdirSync(exportPresetDir, { recursive: true });
    mkdirSync(exportConfigsDir, { recursive: true });

    // Single consolidated export file per profile (Deliverable 3 requirement)
    writeFileSync(join(exportPresetDir, `${canonicalPreset}.cfg`), consolidatedContent, "utf8");
    writeFileSync(join(exportPresetDir, "architecture-report.md"), input.architectureReportMd, "utf8");
    writeFileSync(join(exportPresetDir, "network-design.json"), designStr, "utf8");
    writeFileSync(join(exportPresetDir, "vlsm-allocation.json"), vlsmStr, "utf8");
    writeFileSync(join(exportPresetDir, "decision-log.json"), decisionStr, "utf8");

    for (const cfg of input.deviceConfigs) {
      writeFileSync(join(exportConfigsDir, `${cfg.deviceId}.cfg`), cfg.lines.join("\n"), "utf8");
    }
  } catch {
    // If exports directory write fails (e.g. read-only env), ignore
  }

  const manifest: ExportManifest = {
    scenario: input.scenarioKey,
    generatedAtIso: new Date().toISOString(),
    source: input.source,
    artifacts,
  };

  return {
    outputDirectory: scenarioDir,
    manifest,
  };
}
