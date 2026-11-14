/**
 * Master Cisco Configuration Generator.
 * Coordinates Stage 1 (Intermediate Modeling) and Stage 2 (IOS Rendering).
 * Implements src/contracts/config.ts.
 */
import type {
  ConfigGenerator,
  ConfigBundleInput,
  ConfigGenResult,
  DeviceConfig,
} from "../contracts/config.js";
import type { Device } from "../contracts/topology.js";
import type {
  DeviceConfigModel,
  CiscoHardwareModel,
  CiscoDeviceType,
} from "./model.js";
import { generateVlanDatabase, generateDeviceSvis } from "./generators/vlan.js";
import { generateSwitchInterfaces, generateSpanningTreeConfig } from "./generators/switch.js";
import {
  generateRouterInterfaces,
  generateLoopback,
  generateTunnelInterfaces,
  generateStaticRoutes,
} from "./generators/router.js";
import { generateOspfConfig, generateBgpConfig, generateQosConfig } from "./generators/routing.js";
import { generateDeviceAcls } from "./generators/acl.js";
import { renderCiscoIos } from "./renderer.js";

/**
 * Determines device type and Packet Tracer hardware model.
 */
function resolveHardwareModel(device: Device): {
  type: CiscoDeviceType;
  model: CiscoHardwareModel;
  ipRouting: boolean;
} {
  switch (device.role) {
    case "core-switch":
      return { type: "core-switch", model: "Catalyst-3560", ipRouting: true };
    case "distribution-switch":
      return { type: "distribution-switch", model: "Catalyst-3560", ipRouting: true };
    case "access-switch":
      return { type: "access-switch", model: "Catalyst-2960", ipRouting: false };
    case "edge-router":
      return { type: "router", model: "ISR-4331", ipRouting: true };
    case "wan-router":
      return { type: "router", model: "ISR-4331", ipRouting: true };
    case "cloud-vpn-gateway":
      return { type: "router", model: "ISR-4331", ipRouting: true };
    default:
      return { type: "router", model: "ISR-4331", ipRouting: true };
  }
}

export class CiscoIosConfigGenerator implements ConfigGenerator {
  public generate(input: ConfigBundleInput): ConfigGenResult {
    const configs: DeviceConfig[] = [];
    const warnings: string[] = [];

    let devIdx = 0;
    for (const device of input.devices) {
      const hw = resolveHardwareModel(device);

      // Stage 1: Build Intermediate Device Configuration Model
      const model: DeviceConfigModel = {
        deviceId: device.id,
        hostname: device.id,
        deviceName: device.name,
        deviceType: hw.type,
        hardwareModel: hw.model,
        ipRoutingEnabled: hw.ipRouting,
        vlans: hw.type !== "router" ? generateVlanDatabase(input.vlanPlan) : [],
        interfaces:
          hw.type === "router"
            ? generateRouterInterfaces(device, input.links, input.subnets)
            : generateSwitchInterfaces(device, input.links, input.vlanPlan),
        svis: hw.ipRouting && hw.type !== "router" ? generateDeviceSvis(device.id, input.vlanPlan, input.subnets) : [],
        loopbacks: hw.ipRouting ? [generateLoopback(device, devIdx)] : [],
        tunnels: hw.type === "router" ? generateTunnelInterfaces(device, input.routing) : [],
        staticRoutes: hw.type === "router" ? generateStaticRoutes(device, input.links) : [],
        acls: generateDeviceAcls(device, input.routing),
        banners: [`Authorized Access Only - NetArchitect Managed Network`],
        lines: [
          { type: "con 0", loggingSynchronous: true, loginLocal: true },
          { type: "vty 0 4", transportInput: "ssh", loginLocal: true },
          { type: "vty 5 15", transportInput: "ssh", loginLocal: true },
        ],
      };

      if (hw.type !== "router") {
        model.spanningTree = generateSpanningTreeConfig(device);
      }
      if (hw.ipRouting) {
        const ospf = generateOspfConfig(device, input.routing, devIdx);
        if (ospf) model.ospf = ospf;
      }
      if (hw.type === "router") {
        const bgp = generateBgpConfig(device, input.routing, devIdx);
        if (bgp) model.bgp = bgp;
        const qos = generateQosConfig(input.routing);
        if (qos) model.qos = qos;
      }

      // Stage 2: Render to Cisco IOS Lines
      const lines = renderCiscoIos(model);

      configs.push({
        deviceId: device.id,
        deviceName: device.name,
        fileName: `exports/${input.name}/${device.id}.ios`,
        lines,
      });

      devIdx++;
    }

    return {
      configs,
      warnings,
    };
  }
}

export function createConfigGenerator(): ConfigGenerator {
  return new CiscoIosConfigGenerator();
}
