/**
 * Topology Engine Types & Graph Models.
 */
import type { DeviceRole, Link, Site, Device } from "../../contracts/topology.js";
import type { TransceiverSpec, EthernetStandard } from "../../contracts/media.js";

export interface DeviceInterfaceInfo {
  name: string;
  speedMbps: number;
  kind: "copper" | "fiber" | "virtual";
  connectedToLinkId?: string;
  connectedToDeviceId?: string;
  connectedToInterface?: string;
}

export interface TopologyNode extends Device {
  interfaces: DeviceInterfaceInfo[];
  endpointsServed?: number;
  metadata?: Record<string, unknown>;
}

export interface TopologyEdge extends Link {
  aInterface: string;
  bInterface: string;
  isRedundant?: boolean;
}

export interface TopologyGraph {
  nodes: Map<string, TopologyNode>;
  edges: Map<string, TopologyEdge>;
  sites: Map<string, Site>;
}

export interface DevicePlanningConfig {
  accessSwitchPortCount: number; // default 48
  distributionSwitchPortCount: number; // default 24
  coreSwitchPortCount: number; // default 24
  reservedUplinkPorts: number; // default 4 (ports reserved for uplinks, not access drops)
  growthHeadroomPct: number; // default 20%
  endpointsPerAp: number; // default 24
  poeEnabledForAccess: boolean; // default true
  redundantCore: boolean; // default true
}

export interface BuildingPlanningResult {
  siteId: string;
  siteName: string;
  endpoints: number;
  apCount: number;
  accessSwitchesCount: number;
  distributionSwitchesCount: number;
  totalAccessPortsProvided: number;
  totalAccessPortsNeeded: number;
  poePortsNeeded: number;
  rationale: string[];
}

export interface TopologyBuilderOptions {
  planningConfig?: Partial<DevicePlanningConfig>;
  /** If false, uses standard 3-tier; if true (default), collapsed-core */
  collapsedCore?: boolean;
  /**
   * If true, builds representative access switch stacks (1 per building)
   * for streamlined Packet Tracer / GNS3 deployment, while preserving
   * full mathematical capacity planning in the architecture report.
   */
  representativeAccess?: boolean;
}
