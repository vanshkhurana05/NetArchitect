/**
 * Routing Configuration Generator.
 * Populates OSPF, BGP, and DiffServ QoS intermediate models.
 * OWNER: Configuration Generator Agent (src/configuration/).
 */
import type { Device } from "../../contracts/topology.js";
import type { RoutingPlan } from "../../contracts/routing.js";
import type {
  OspfConfigModel,
  BgpConfigModel,
  QosConfigModel,
  OspfNetworkStatement,
  OspfSummaryRange,
} from "../model.js";

/**
 * Builds OSPF process configuration for a router or L3 switch.
 */
export function generateOspfConfig(
  device: Device,
  routing: RoutingPlan,
  routerIndex: number = 0,
): OspfConfigModel | undefined {
  if (routing.protocol !== "single-area-ospf" && routing.protocol !== "multi-area-ospf" && routing.protocol !== "ospf-ebgp") {
    return undefined;
  }

  // Find areas that include this device's site
  const relevantAreas = routing.areas.filter(
    (a) => a.siteIds.includes(device.siteId) || a.areaId === 0,
  );

  const networks: OspfNetworkStatement[] = [];
  const summaryRanges: OspfSummaryRange[] = [];

  for (const area of relevantAreas) {
    for (const net of area.networks) {
      // Split "10.0.0.0/24" into base IP
      const baseIp = net.cidr.split("/")[0]!;
      networks.push({
        network: baseIp,
        wildcard: net.wildcard,
        area: area.areaId,
      });
    }

    if (area.summaryRoutes) {
      for (const s of area.summaryRoutes) {
        if (s.abrDeviceId === device.id) {
          const parts = s.summaryCidr.split("/");
          const base = parts[0]!;
          summaryRanges.push({
            area: area.areaId,
            network: base,
            netmask: "255.255.240.0", // Summarized mask
          });
        }
      }
    }
  }

  const routerId = `10.255.255.${routerIndex + 1}`;

  const config: OspfConfigModel = {
    processId: 1,
    routerId,
    networks,
    passiveInterfaces: ["default"],
  };
  if (summaryRanges.length > 0) {
    config.summaryRanges = summaryRanges;
  }

  return config;
}

/**
 * Builds BGP configuration for border routers.
 */
export function generateBgpConfig(
  device: Device,
  routing: RoutingPlan,
  routerIndex: number = 0,
): BgpConfigModel | undefined {
  if (routing.bgp.length === 0) return undefined;

  const deviceSessions = routing.bgp.filter((s) => s.localDeviceId === device.id);
  if (deviceSessions.length === 0) return undefined;

  const routerId = `10.255.255.${routerIndex + 1}`;

  const neighbors = deviceSessions.map((s) => ({
    ip: s.neighborIp,
    remoteAs: s.remoteAsNumber,
    description: `Cloud VPC eBGP Peer (AS ${s.remoteAsNumber})`,
  }));

  const aggregates = deviceSessions.flatMap((s) =>
    s.advertiseCidrs.map((cidr) => {
      const base = cidr.split("/")[0]!;
      return {
        network: base,
        netmask: "255.255.240.0",
        summaryOnly: true,
      };
    }),
  );

  const config: BgpConfigModel = {
    asNumber: routing.asNumber,
    routerId,
    neighbors,
    networks: [],
  };
  if (aggregates.length > 0) {
    config.aggregates = aggregates;
  }

  return config;
}

/**
 * Builds DiffServ QoS intermediate configuration.
 */
export function generateQosConfig(routing: RoutingPlan): QosConfigModel | undefined {
  if (!routing.qos || routing.qos.length === 0) return undefined;

  const classes = routing.qos.map((q) => {
    const classModel: any = {
      name: q.className,
      dscp: q.dscp,
    };
    if (q.dscp === "ef") {
      classModel.priorityPct = q.bandwidthPct;
    } else {
      classModel.bandwidthPct = q.bandwidthPct;
    }
    return classModel;
  });

  return {
    classes,
    policies: [
      {
        name: "METRO-EVPL-POLICY",
        classes,
      },
    ],
  };
}
