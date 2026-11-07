/**
 * Runnable demo demonstrating Layer 3 Routing Planning, OSPF, eBGP,
 * Route Summarization, QoS DiffServ, and Boundary Subnet Logic.
 *
 * Usage: npm run example:routing
 */
import { loadPreset } from "../src/profiles/index.js";
import { buildTopology } from "../src/engines/topology/index.js";
import { planVlans, deriveVlsmRequests } from "../src/engines/vlan/index.js";
import { allocateVlsm } from "../src/engines/vlsm/index.js";
import {
  planRouting,
  calculateRouteSummary,
  chooseRoutingProtocol,
} from "../src/engines/routing/index.js";

async function runRoutingDemo() {
  console.log("================================================================================");
  console.log(" NetArchitect — Layer 3 Routing Decision Engine Demo");
  console.log("================================================================================\n");

  // 1. Campus LAN Routing Plan
  console.log(">>> [1/3] Campus LAN: Single-Area OSPF (Area 0, Single AS < 50 Subnets)");
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

  const campusVlans = planVlans({
    requests: campusInput.vlanRequests,
    siteIds: campusInput.buildings.map((b: any) => b.id),
    devices: campusTopo.devices,
    links: campusTopo.links,
  });

  const campusVlsm = allocateVlsm(
    campusInput.rootBlockCidr,
    deriveVlsmRequests(campusVlans.vlanPlan.items, campusInput.vlanRequests),
  );

  const campusRouting = planRouting({
    profile: "campus-lan",
    asNumber: 65001,
    sites: campusTopo.sites,
    devices: campusTopo.devices,
    subnets: campusVlsm.subnets,
  });

  console.log(`- Routing protocol: ${campusRouting.protocol} (RFC 2328 fast convergence)`);
  console.log(`- OSPF Areas: ${campusRouting.areas.length} area(s)`);
  console.log(`- Area 0 Networks:`);
  for (const net of campusRouting.areas[0]?.networks ?? []) {
    console.log(`    network ${net.cidr.padEnd(18)} wildcard ${net.wildcard} area 0`);
  }
  console.log("");

  // 2. Metro MAN Routing Plan
  console.log(">>> [2/3] Metro MAN: Multi-Area OSPF, QoS DiffServ & EVPL Route Failover");
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

  const metroVlans = planVlans({
    requests: metroInput.vlanRequests,
    siteIds: metroInput.sites.map((s: any) => s.id),
    devices: metroTopo.devices,
    links: metroTopo.links,
  });

  const metroVlsm = allocateVlsm(
    metroInput.rootBlockCidr,
    deriveVlsmRequests(metroVlans.vlanPlan.items, metroInput.vlanRequests),
  );

  const metroRouting = planRouting({
    profile: "metro-man",
    asNumber: 65001,
    sites: metroTopo.sites,
    devices: metroTopo.devices,
    subnets: metroVlsm.subnets,
    qosClasses: metroInput.qosClasses,
    links: metroTopo.links,
    evplBandwidthMbps: metroInput.evplBandwidthMbps,
  });

  console.log(`- Routing protocol: ${metroRouting.protocol}`);
  console.log(`- OSPF Areas: ${metroRouting.areas.length} areas (${metroRouting.areas.map((a) => `Area ${a.areaId}`).join(", ")})`);
  console.log(`- DiffServ QoS Queueing: ${metroRouting.qos?.length} classes`);
  for (const q of metroRouting.qos ?? []) {
    console.log(`    Class: ${q.className.padEnd(25)} DSCP: ${q.dscp.padEnd(8)} Bandwidth: ${q.bandwidthPct}%`);
  }
  console.log("");

  // 3. Global WAN Routing Plan
  console.log(">>> [3/3] Global WAN: OSPF + eBGP, Cloud VPC Boundary & IKEv2 IPsec VPN");
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

  const wanVlans = planVlans({
    requests: wanInput.vlanRequests,
    siteIds: wanInput.cities.map((c: any) => c.id),
    devices: wanTopo.devices,
    links: wanTopo.links,
  });

  const wanVlsm = allocateVlsm(
    wanInput.rootBlockCidr,
    deriveVlsmRequests(wanVlans.vlanPlan.items, wanInput.vlanRequests),
  );

  const wanRouting = planRouting({
    profile: "global-wan",
    asNumber: 65001,
    sites: wanTopo.sites,
    devices: wanTopo.devices,
    subnets: wanVlsm.subnets,
    cloudVpc: wanInput.cloudVpc,
    links: wanTopo.links,
  });

  console.log(`- Routing protocol: ${wanRouting.protocol} (RFC 4271 inter-domain)`);
  console.log(`- eBGP Sessions: ${wanRouting.bgp.length}`);
  for (const bgp of wanRouting.bgp) {
    console.log(`    Local RTR: ${bgp.localDeviceId} -> Neighbor: ${bgp.neighborIp} (Remote AS: ${bgp.remoteAsNumber})`);
    console.log(`    Advertised Supernet: ${bgp.advertiseCidrs.join(", ")}`);
  }
  console.log(`- IKEv2 IPsec Tunnels: ${wanRouting.vpnTunnels.length}`);
  for (const vpn of wanRouting.vpnTunnels) {
    console.log(`    Local: ${vpn.localProtectedCidr} <===> Remote VPC: ${vpn.remoteProtectedCidr} (Peer: ${vpn.peerPublicIp})`);
  }

  // 4. Boundary Demo: 49 vs 50 Subnet Scalability Rule
  console.log("\n>>> [Boundary Analysis] Subnet Scalability Threshold (49 vs 50 subnets):");
  const dummy49 = Array.from({ length: 49 }, (_, i) => ({ ...campusVlsm.subnets[0]!, name: `S-${i}`, network: `10.0.${Math.floor(i/256)}.${i%256}` }));
  const dummy50 = Array.from({ length: 50 }, (_, i) => ({ ...campusVlsm.subnets[0]!, name: `S-${i}`, network: `10.0.${Math.floor(i/256)}.${i%256}` }));

  const res49 = chooseRoutingProtocol({ ...campusInput, asNumber: 65001, sites: campusTopo.sites, devices: campusTopo.devices, subnets: dummy49 });
  const res50 = chooseRoutingProtocol({ ...campusInput, asNumber: 65001, sites: campusTopo.sites, devices: campusTopo.devices, subnets: dummy50 });

  console.log(`- 49 subnets: Evaluated as -> [${res49.protocol}] (${res49.explanation.decision})`);
  console.log(`- 50 subnets: Evaluated as -> [${res50.protocol}] (${res50.explanation.decision})`);

  // 5. Route Summarization Demo
  const summary = calculateRouteSummary(campusVlsm.subnets);
  console.log(`\n- Route Supernet Summary for Campus Subnets: ${summary.summaryCidr} (Mask: ${summary.netmask}, Wildcard: ${summary.wildcard})`);

  console.log("\n================================================================================");
  console.log(" Routing Engine Demo Completed Successfully!");
  console.log("================================================================================");
}

runRoutingDemo().catch((err) => {
  console.error("Routing demo failed:", err);
  process.exit(1);
});
