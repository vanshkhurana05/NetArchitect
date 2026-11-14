/**
 * Export Manager implementation.
 */
import type { ExportManager, ExportBundle, ExportDirectoryLayout, ExportManifest } from "../../contracts/export.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export class FilesystemExportManager implements ExportManager {
  private readonly baseDir: string;

  constructor(baseDir: string = "outputs") {
    this.baseDir = baseDir;
  }

  public async export(bundle: ExportBundle): Promise<ExportDirectoryLayout> {
    const root = join(this.baseDir, bundle.scenarioName);
    const configsDir = join(root, "configurations");

    mkdirSync(root, { recursive: true });
    mkdirSync(configsDir, { recursive: true });

    const reportPath = join(root, "architecture-report.md");
    writeFileSync(reportPath, bundle.reportMarkdown, "utf8");

    const designPath = join(root, "network-design.json");
    writeFileSync(designPath, JSON.stringify(bundle.designJson, null, 2), "utf8");

    const verifyPath = join(root, "verification.md");
    writeFileSync(verifyPath, bundle.verificationMarkdown, "utf8");

    for (const cfg of bundle.configs) {
      const cfgPath = join(configsDir, cfg.fileName.endsWith(".cfg") ? cfg.fileName : `${cfg.fileName}.cfg`);
      writeFileSync(cfgPath, cfg.lines.join("\n"), "utf8");
    }

    const manifest: ExportManifest = {
      scenario: bundle.scenarioName,
      generatedAtIso: new Date().toISOString(),
      source: "preset",
      artifacts: [
        { path: reportPath, kind: "markdown-report", bytes: Buffer.byteLength(bundle.reportMarkdown, "utf8") },
        { path: designPath, kind: "json-design", bytes: 1000 },
        { path: verifyPath, kind: "verification", bytes: Buffer.byteLength(bundle.verificationMarkdown, "utf8") },
      ],
    };

    return {
      root,
      manifest,
    };
  }
}

export function createExportManager(baseDir?: string): ExportManager {
  return new FilesystemExportManager(baseDir);
}

export * from "../../exporters/artifact.exporter.js";
