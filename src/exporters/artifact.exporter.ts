/**
 * Artifact Exporter.
 * Persists complete design deliverables to the filesystem:
 * outputs/<scenario>/
 *  ├── network-design.json
 *  ├── architecture-report.md
 *  ├── decision-log.json
 *  ├── vlsm-allocation.json
 *  └── configurations/*.cfg
 * OWNER: Final Integration & Release Agent.
 */
import { writeFileSync, mkdirSync, statSync } from "node:fs";
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

export function exportDesignArtifacts(input: ArtifactExportInput): ArtifactExportResult {
  const baseOut = input.outDir ?? "outputs";
  const scenarioDir = join(baseOut, input.scenarioKey);
  const configsDir = join(scenarioDir, "configurations");

  mkdirSync(scenarioDir, { recursive: true });
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

  // 5. configurations/*.cfg
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
