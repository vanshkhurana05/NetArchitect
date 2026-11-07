/**
 * Sample Configuration Exporter.
 * Generates sample .cfg / .ios files for all three preset profiles
 * using the two-stage configuration architecture.
 *
 * Usage: npm run example:configgen
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadPreset } from "../src/profiles/index.js";
import { buildTopology } from "../src/engines/topology/index.js";
import { planVlans, deriveVlsmRequests } from "../src/engines/vlan/index.js";
import { allocateVlsm } from "../src/engines/vlsm/index.js";
import { planRouting } from "../src/engines/routing/index.js";
import { createConfigGenerator } from "../src/configuration/index.js";

async function generateAllSampleConfigs() {
  console.log("================================================================================");
  console.log(" NetArchitect — Cisco IOS Configuration Generator & Sample .cfg Exporter");
  console.log("================================================================================\n");

  const generator = createConfigGenerator();
  const scenarios = ["campus-lan", "metro-man", "global-wan"] as const;

  for (const scenario of scenarios) {
    console.log(`>>> Generating configurations for: ${scenario.toUpperCase()} ...`);
    const run = await loadPreset(scenario);
    const input = run.input as any;

    // 1. Build Topology
    const topo = buildTopology({
      profileShape: {
        profile: scenario,
        ...(scenario === "campus-lan" && { buildings: input.buildings, collapsedCore: input.collapsedCore }),
        ...(scenario === "metro-man" && { sites: input.sites, dualHomedFailover: input.dualHomedFailover, evplBandwidthMbps: input.evplBandwidthMbps }),
        ...(scenario === "global-wan" && { cities: input.cities, cloudVpc: input.cloudVpc }),
      } as any,
      mediaByRole: new Map(),
    });

    // 2. Plan VLANs
    const siteIds =
      scenario === "campus-lan"
        ? input.buildings.map((b: any) => b.id)
        : scenario === "metro-man"
          ? input.sites.map((s: any) => s.id)
          : input.cities.map((c: any) => c.id);

    const vlans = planVlans({
      requests: input.vlanRequests,
      siteIds,
      devices: topo.devices,
      links: topo.links,
    });

    // 3. Allocate VLSM Subnets
    const vlsm = allocateVlsm(
      input.rootBlockCidr,
      deriveVlsmRequests(vlans.vlanPlan.items, input.vlanRequests),
    );

    // 4. Plan Routing
    const routing = planRouting({
      profile: scenario,
      asNumber: 65001,
      sites: topo.sites,
      devices: topo.devices,
      subnets: vlsm.subnets,
      ...(scenario === "metro-man" && { qosClasses: input.qosClasses, links: topo.links, evplBandwidthMbps: input.evplBandwidthMbps }),
      ...(scenario === "global-wan" && { cloudVpc: input.cloudVpc, links: topo.links }),
    });

    // 5. Generate Cisco Configurations (Stage 1 IR + Stage 2 IOS Renderer)
    const result = generator.generate({
      name: scenario,
      devices: topo.devices,
      links: topo.links,
      vlanPlan: vlans.vlanPlan,
      subnets: vlsm.subnets,
      routing,
    });

    const outDir = join(process.cwd(), "samples", scenario);
    mkdirSync(outDir, { recursive: true });

    console.log(`  Rendered ${result.configs.length} device configurations.`);

    for (const cfg of result.configs) {
      const cfgPath = join(outDir, `${cfg.deviceId}.cfg`);
      writeFileSync(cfgPath, cfg.lines.join("\n"), "utf8");
    }

    console.log(`  Saved .cfg files to: samples/${scenario}/\n`);
  }

  console.log("================================================================================");
  console.log(" Sample .cfg Generation Completed Successfully!");
  console.log("================================================================================");
}

generateAllSampleConfigs().catch((err) => {
  console.error("Config generation failed:", err);
  process.exit(1);
});
