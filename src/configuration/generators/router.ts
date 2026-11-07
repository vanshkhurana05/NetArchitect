/**
 * Router Configuration Generator.
 * Populates routed interfaces, sub-interfaces (Router-on-a-Stick),
 * Loopback0, IPsec tunnel interfaces, and static failover routes.
 * OWNER: Configuration Generator Agent (src/configuration/).
 */
import type { Device, Link } from "../../contracts/topology.js";
import type { SubnetPlanItem } from "../../contracts/vlsm.js";
import type { RoutingPlan } from "../../contracts/routing.js";
import type {
  InterfaceConfigModel,
  LoopbackConfigModel,
  TunnelConfigModel,
  StaticRouteConfigModel,
} from "../model.js";

/**
 * Builds router interface configurations.
 */
export function generateRouterInterfaces(
  device: Device,
  links: Link[],
  subnets: SubnetPlanItem[],
): InterfaceConfigModel[] {
  const ifaces: InterfaceConfigModel[] = [];
  const connectedLinks = links.filter(
    (l) => l.aDeviceId === device.id || l.bDeviceId === device.id,
  );

  let portIdx = 1;
  for (const link of connectedLinks) {
    const otherDevId = link.aDeviceId === device.id ? link.bDeviceId : link.aDeviceId;
    const isWan = link.kind === "evpl" || link.kind === "physical";
    const portName = `GigabitEthernet0/${portIdx}`;

    // Look for matching point-to-point subnet or derive interface IP
    const linkSubnet = subnets.find((s) => s.name.includes(link.id) || s.prefix === 31 || s.prefix === 30);
    const ipAddress = linkSubnet ? (link.aDeviceId === device.id ? linkSubnet.firstHost : linkSubnet.lastHost) : undefined;
    const subnetMask = linkSubnet?.mask;

    const iface: InterfaceConfigModel = {
      name: portName,
      description: `${isWan ? "WAN/EVPL" : "LAN"} Link to ${otherDevId} (${link.id})`,
      enabled: true,
      mode: "routed",
    };
    if (ipAddress) iface.ipAddress = ipAddress;
    if (subnetMask) iface.subnetMask = subnetMask;

    ifaces.push(iface);
    portIdx++;
  }

  return ifaces;
}

/**
 * Builds Loopback0 interface used for stable OSPF/BGP router ID.
 */
export function generateLoopback(
  device: Device,
  index: number = 0,
): LoopbackConfigModel {
  // Deterministic loopback IP based on device index (e.g. 10.255.255.X)
  const lastOctet = Math.max(1, index + 1);
  return {
    id: 0,
    ipAddress: `10.255.255.${lastOctet}`,
    subnetMask: "255.255.255.255",
    description: `Router-ID Anchor for ${device.name}`,
  };
}

/**
 * Builds IPsec Tunnel interfaces for VPN connectivity.
 */
export function generateTunnelInterfaces(
  device: Device,
  routing: RoutingPlan,
): TunnelConfigModel[] {
  const tunnels: TunnelConfigModel[] = [];
  const deviceTunnels = routing.vpnTunnels.filter((t) => t.deviceId === device.id);

  let tunnelIdx = 100;
  for (const vpn of deviceTunnels) {
    tunnels.push({
      id: tunnelIdx,
      ipAddress: `172.31.255.${tunnelIdx - 99}`,
      subnetMask: "255.255.255.252",
      sourceInterface: "GigabitEthernet0/1",
      destinationIp: vpn.peerPublicIp,
      mode: "ipsec-ipv4",
      ipsecProfile: vpn.cryptoProfileName,
      description: `IPsec Site-to-Site Tunnel to Cloud VPC (${vpn.peerPublicIp})`,
    });
    tunnelIdx++;
  }

  return tunnels;
}

/**
 * Builds static routes for dual-homed failover (primary metric 10, secondary metric 20).
 */
export function generateStaticRoutes(
  device: Device,
  links: Link[],
): StaticRouteConfigModel[] {
  const routes: StaticRouteConfigModel[] = [];

  // If device has secondary redundant link
  const deviceLinks = links.filter(
    (l) => l.aDeviceId === device.id || l.bDeviceId === device.id,
  );
  const priLink = deviceLinks.find((l) => l.id.includes("PRI"));
  const secLink = deviceLinks.find((l) => l.id.includes("SEC"));

  if (priLink && secLink) {
    routes.push({
      prefix: "0.0.0.0",
      netmask: "0.0.0.0",
      nextHop: "10.0.0.1",
      distance: 1,
      description: "Primary default route via EVPL-PRI",
    });
    routes.push({
      prefix: "0.0.0.0",
      netmask: "0.0.0.0",
      nextHop: "10.0.0.2",
      distance: 10, // Floating static route with distance 10
      description: "Backup floating route via EVPL-SEC",
    });
  }

  return routes;
}
