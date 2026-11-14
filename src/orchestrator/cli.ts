#!/usr/bin/env node
/**
 * NetArchitect CLI Entrypoint.
 * Usage:
 *   netarch run --preset campus-lan [--out outputs]
 *   netarch run --input custom.json [--out outputs]
 *   netarch validate --input custom.json
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPreset, validateCustomNetArchRequirements } from "../profiles/index.js";
import { runNetArch } from "./pipeline.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const command = args[0];

  // Helper flags
  function getFlagValue(flag: string): string | undefined {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
    return undefined;
  }

  const outDir = getFlagValue("--out") ?? "outputs";
  const isFullChassis = args.includes("--full") || args.includes("--full-chassis");
  const representative = !isFullChassis; // Default to representative for clean Packet Tracer submission

  if (command === "validate") {
    const inputFile = getFlagValue("--input");
    if (!inputFile) {
      console.error("Error: --input <path.json> is required for validate command.");
      process.exit(1);
    }
    await handleValidate(inputFile);
    return;
  }

  if (command === "run") {
    const preset = getFlagValue("--preset");
    const inputFile = getFlagValue("--input");

    if (preset) {
      await handleRunPreset(preset, outDir, representative);
      return;
    }

    if (inputFile) {
      await handleRunCustom(inputFile, outDir, representative);
      return;
    }

    console.error("Error: Either --preset <name> or --input <file> must be supplied to run.");
    process.exit(1);
  }

  // Direct shortcuts: netarch campus | metro | global
  if (command === "campus" || command === "campus-lan") {
    await handleRunPreset("campus-lan", outDir, representative);
    return;
  }
  if (command === "metro" || command === "metro-man") {
    await handleRunPreset("metro-man", outDir, representative);
    return;
  }
  if (command === "global" || command === "global-wan") {
    await handleRunPreset("global-wan", outDir, representative);
    return;
  }

  console.error(`Unknown command: "${command}". Run "netarch --help" for usage.`);
  process.exit(1);
}

async function handleRunPreset(presetName: string, outDir: string, representative: boolean = true) {
  let canonicalName = presetName;
  if (presetName === "campus") canonicalName = "campus-lan";
  if (presetName === "metro") canonicalName = "metro-man";
  if (presetName === "global") canonicalName = "global-wan";

  console.log(`\n================================================================================`);
  console.log(` NetArchitect — Executing Preset Pipeline: [${canonicalName.toUpperCase()}]`);
  console.log(` Topology Mode: [${representative ? "REPRESENTATIVE (PACKET TRACER READY)" : "FULL CHASSIS INVENTORY"}]`);
  console.log(`================================================================================\n`);

  try {
    const runInput = await loadPreset(canonicalName as any);
    const report = await runNetArch(runInput, { outDir, representative });

    printReportSummary(report, outDir);
  } catch (err: any) {
    console.error(`Execution failed: ${err.message ?? err}`);
    process.exit(1);
  }
}

async function handleRunCustom(filePath: string, outDir: string, representative: boolean = true) {
  console.log(`\n================================================================================`);
  console.log(` NetArchitect — Executing Custom Network Requirements: [${filePath}]`);
  console.log(` Topology Mode: [${representative ? "REPRESENTATIVE (PACKET TRACER READY)" : "FULL CHASSIS INVENTORY"}]`);
  console.log(`================================================================================\n`);

  try {
    const rawText = readFileSync(resolve(process.cwd(), filePath), "utf8");
    const rawJson = JSON.parse(rawText);

    const checked = validateCustomNetArchRequirements(rawJson);
    if ("error" in checked) {
      console.error(`Validation Failed: ${checked.error}`);
      for (const diag of checked.diagnostics) {
        console.error(`  - [${diag.code}] ${diag.path}: ${diag.message}`);
      }
      process.exit(1);
    }

    const report = await runNetArch(checked, { outDir, representative });
    printReportSummary(report, outDir);
  } catch (err: any) {
    console.error(`Custom execution failed: ${err.message ?? err}`);
    process.exit(1);
  }
}

async function handleValidate(filePath: string) {
  try {
    const rawText = readFileSync(resolve(process.cwd(), filePath), "utf8");
    const rawJson = JSON.parse(rawText);

    const checked = validateCustomNetArchRequirements(rawJson);
    if ("error" in checked) {
      console.error(`Validation Failed: ${checked.error}`);
      for (const diag of checked.diagnostics) {
        console.error(`  - [${diag.code}] ${diag.path}: ${diag.message}`);
      }
      process.exit(1);
    }

    console.log(`Validation Successful! Requirements valid for profile "${checked.input.profile}".`);
    if (checked.advisories.length > 0) {
      console.log("Advisories:");
      for (const adv of checked.advisories) {
        console.log(`  - ℹ️ ${adv}`);
      }
    }
  } catch (err: any) {
    console.error(`Validation error: ${err.message ?? err}`);
    process.exit(1);
  }
}

function printReportSummary(report: any, outDir: string) {
  console.log(">>> Pipeline Stage Execution Summary:");
  for (const st of report.stages) {
    const status = st.ok ? "OK ✅" : "FAIL ❌";
    console.log(`  - ${st.name.padEnd(35)} : ${String(st.millis).padStart(4)} ms [${status}]`);
  }

  if (report.rejections.length > 0) {
    console.log("\n❌ Pipeline Rejections Encountered:");
    for (const rej of report.rejections) {
      console.error(`  - [${rej.stage}] ${rej.code}: ${rej.message}`);
    }
    process.exit(1);
  }

  console.log(`\n✅ Design Execution Complete!`);
  console.log(`  - Scenario Output Directory: ${outDir}/${report.scenario}/`);
  console.log(`  - Architecture Report:       ${outDir}/${report.scenario}/architecture-report.md`);
  console.log(`  - Network Design JSON:       ${outDir}/${report.scenario}/network-design.json`);
  console.log(`  - VLSM Subnet Plan:          ${outDir}/${report.scenario}/vlsm-allocation.json`);
  console.log(`  - Decision Log:              ${outDir}/${report.scenario}/decision-log.json`);
  console.log(`  - Cisco Configurations:      ${outDir}/${report.scenario}/configurations/ (${report.configs?.length ?? 0} files)`);
  console.log("\n================================================================================\n");
}

function printHelp() {
  console.log(`
NetArchitect — Algorithmic Network Recommendation & Cisco Configuration Engine (CIC-307)

Usage:
  netarch run --preset <name> [--out <dir>]
  netarch run --input <file.json> [--out <dir>]
  netarch validate --input <file.json>

Presets:
  campus-lan (alias: campus)   - 3 buildings, 1,600 endpoints, RSTP, Single-Area OSPF
  metro-man  (alias: metro)    - HQ + 2 remote sites, EVPL, QoS, sub-5ms failover
  global-wan (alias: global)   - 4 cities + Cloud VPC, 2,000 IoT, IPsec, eBGP

Options:
  --out <dir>                  Output base directory (default: outputs/)
  --full, --full-chassis       Generate full 49-chassis physical inventory instead of representative stack
  --help, -h                   Show this help message
`);
}

main().catch((err) => {
  console.error("Fatal CLI Error:", err);
  process.exit(1);
});
