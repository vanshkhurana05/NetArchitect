/**
 * Runnable demo demonstrating Topology Graph Building, Graph Validation,
 * VLAN Planning, and direct derivation of VLSM Subnet Requests.
 *
 * Usage: npm run example:topology-vlan
 */
import { loadPreset } from "../src/profiles/index.js";
import { buildTopology, validateTopologyGraph, exportTopologyToDot } from "../src/engines/topology/index.js";
import { planVlans, deriveVlsmRequests } from "../src/engines/vlan/index.js";
import { allocateVlsm } from "../src/engines/vlsm/index.js";

async function runDemo() {
  console.log("================================================================================");
  console.log(" NetArchitect — Topology & VLAN Planning Engine Demo");
  console.log("================================================================================\n");

  // 1. Campus LAN Scenario
  console.log(">>> [1/3] Campus LAN Scenario (3 Buildings, 1,600 Endpoints)");
  const campusRun = await loadPreset("campus-lan");
  const campusInput = campusRun.input as any;

  const campusTopo = buildTopology({
    profileShape: {
      profile: "campus-lan",
      buildings: campusInput.buildings,
      collapsedCore: campusInput.collapsedCore,
    },
    mediaByRole: new Map(),
  });

  const campusValidation = validateTopologyGraph(campusTopo);
  console.log(`- Topology built: ${campusTopo.devices.length} devices, ${campusTopo.links.length} links, ${campusTopo.sites.length} sites.`);
  console.log(`- Graph validation: ${campusValidation.valid ? "PASSED (0 errors)" : "FAILED"}`);

  const campusVlans = planVlans({
    requests: campusInput.vlanRequests,
    siteIds: campusInput.buildings.map((b: any) => b.id),
    devices: campusTopo.devices,
    links: campusTopo.links,
  });

  console.log(`- VLAN plan: ${campusVlans.vlanPlan.items.length} 802.1Q VLANs, ${campusVlans.vlanPlan.trunks.length} trunks, Native VLAN 99 hardened.`);
  console.log(`- Planned VLAN IDs: [${campusVlans.vlanPlan.items.map((v) => `${v.name}: VLAN ${v.vlanId}`).join(", ")}]`);

  const campusVlsmReqs = deriveVlsmRequests(campusVlans.vlanPlan.items, campusInput.vlanRequests);
  const campusVlsmPlan = allocateVlsm(campusInput.rootBlockCidr, campusVlsmReqs);
  console.log(`- Fed derived requests into VLSM allocator: ${campusVlsmPlan.subnets.length} subnets carved under ${campusInput.rootBlockCidr}.`);
  console.log("");

  // 2. Metro MAN Scenario
  console.log(">>> [2/3] Metro MAN Scenario (HQ + 2 Remote Sites, Dual-Homed EVPL)");
  const metroRun = await loadPreset("metro-man");
  const metroInput = metroRun.input as any;

  const metroTopo = buildTopology({
    profileShape: {
      profile: "metro-man",
      sites: metroInput.sites,
      dualHomedFailover: metroInput.dualHomedFailover,
      evplBandwidthMbps: metroInput.evplBandwidthMbps,
    },
    mediaByRole: new Map(),
  });

  const metroValidation = validateTopologyGraph(metroTopo);
  console.log(`- Topology built: ${metroTopo.devices.length} devices, ${metroTopo.links.length} links.`);
  console.log(`- Graph validation: ${metroValidation.valid ? "PASSED (0 errors)" : "FAILED"}`);
  console.log("");

  // 3. Global WAN Scenario
  console.log(">>> [3/3] Global WAN Scenario (4 Cities + AWS Cloud VPC)");
  const wanRun = await loadPreset("global-wan");
  const wanInput = wanRun.input as any;

  const wanTopo = buildTopology({
    profileShape: {
      profile: "global-wan",
      cities: wanInput.cities,
      cloudVpc: wanInput.cloudVpc,
    },
    mediaByRole: new Map(),
  });

  const wanValidation = validateTopologyGraph(wanTopo);
  console.log(`- Topology built: ${wanTopo.devices.length} devices, ${wanTopo.links.length} links.`);
  console.log(`- Graph validation: ${wanValidation.valid ? "PASSED (0 errors)" : "FAILED"}`);

  const dotPreview = exportTopologyToDot(metroTopo);
  console.log("\n- Graphviz DOT sample output (Metro MAN):");
  console.log(dotPreview.split("\n").slice(0, 15).join("\n") + "\n  ...");

  console.log("\n================================================================================");
  console.log(" Demo Completed Successfully: Topology & VLAN Planning Verified End-to-End!");
  console.log("================================================================================");
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
