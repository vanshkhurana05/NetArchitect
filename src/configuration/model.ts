/**
 * Intermediate Device Configuration Model (IR).
 * Decouples logical network planning from physical CLI command rendering.
 * Stage 1 of the two-stage configuration architecture.
 * OWNER: Configuration Generator Agent (src/configuration/).
 */

export type CiscoDeviceType =
  | "router"
  | "core-switch"
  | "distribution-switch"
  | "access-switch";

export type CiscoHardwareModel =
  | "Catalyst-2960"
  | "Catalyst-3560"
  | "Catalyst-3650"
  | "ISR-2911"
  | "ISR-4331";

export interface VlanConfigModel {
  vlanId: number;
  name: string;
  state?: "active" | "suspend";
}

export interface SpanningTreeConfigModel {
  mode: "rapid-pvst" | "rstp" | "mst";
  priority?: number; // e.g. 4096 for primary root, 8192 for secondary root
  portfastDefault?: boolean;
  bpduguardDefault?: boolean;
}

export interface InterfaceConfigModel {
  name: string; // e.g. "GigabitEthernet1/0/1"
  description?: string;
  enabled: boolean;
  mode: "access" | "trunk" | "routed" | "none";
  accessVlan?: number;
  trunkAllowedVlans?: number[];
  nativeVlan?: number;
  ipAddress?: string;
  subnetMask?: string;
  speed?: string;
  duplex?: string;
  servicePolicyIn?: string;
  servicePolicyOut?: string;
  ipAccessGroupIn?: string;
  ipAccessGroupOut?: string;
}

export interface SviConfigModel {
  vlanId: number;
  ipAddress: string;
  subnetMask: string;
  description?: string;
  enabled: boolean;
}

export interface LoopbackConfigModel {
  id: number;
  ipAddress: string;
  subnetMask: string;
  description?: string;
}

export interface TunnelConfigModel {
  id: number;
  ipAddress?: string;
  subnetMask?: string;
  sourceInterface: string;
  destinationIp: string;
  mode: "ipsec-ipv4" | "gre-ip";
  ipsecProfile?: string;
  description?: string;
}

export interface OspfNetworkStatement {
  network: string; // "10.0.0.0"
  wildcard: string; // "0.0.3.255"
  area: number; // 0
}

export interface OspfSummaryRange {
  area: number;
  network: string;
  netmask: string;
}

export interface OspfConfigModel {
  processId: number;
  routerId: string;
  networks: OspfNetworkStatement[];
  summaryRanges?: OspfSummaryRange[];
  passiveInterfaces?: string[];
}

export interface BgpNeighborModel {
  ip: string;
  remoteAs: number;
  description?: string;
  updateSource?: string;
}

export interface BgpAggregateModel {
  network: string;
  netmask: string;
  summaryOnly: boolean;
}

export interface BgpConfigModel {
  asNumber: number;
  routerId: string;
  neighbors: BgpNeighborModel[];
  networks: Array<{ network: string; netmask: string }>;
  aggregates?: BgpAggregateModel[];
}

export interface StaticRouteConfigModel {
  prefix: string;
  netmask: string;
  nextHop: string;
  distance?: number;
  description?: string;
}

export interface AclRuleModel {
  action: "permit" | "deny";
  protocol: "ip" | "tcp" | "udp" | "icmp" | "esp";
  source: string; // "any" or "10.0.0.0" or "host 1.2.3.4"
  sourceWildcard?: string;
  destination: string;
  destinationWildcard?: string;
  destinationPort?: string;
  remark?: string;
}

export interface AclConfigModel {
  name: string;
  type: "standard" | "extended";
  rules: AclRuleModel[];
}

export interface QosClassModel {
  name: string;
  dscp: string;
  priorityPct?: number;
  bandwidthPct?: number;
}

export interface QosPolicyModel {
  name: string;
  classes: QosClassModel[];
}

export interface QosConfigModel {
  classes: QosClassModel[];
  policies: QosPolicyModel[];
}

export interface CryptoTransformSetModel {
  name: string;
  espEncryption: string; // e.g. "esp-aes 256"
  espIntegrity: string; // e.g. "esp-sha384-hmac"
}

export interface CryptoIkev2ProposalModel {
  name: string;
  encryption: string;
  integrity: string;
  group: string;
}

export interface CryptoMapModel {
  name: string;
  sequence: number;
  peerIp: string;
  transformSet: string;
  matchAcl: string;
}

export interface CryptoConfigModel {
  ikev2Proposals: CryptoIkev2ProposalModel[];
  transformSets: CryptoTransformSetModel[];
  cryptoMaps?: CryptoMapModel[];
}

export interface LineConfigModel {
  type: "con 0" | "vty 0 4" | "vty 5 15";
  password?: string;
  loginLocal?: boolean;
  transportInput?: "ssh" | "telnet" | "all" | "none";
  execTimeoutMinutes?: number;
  loggingSynchronous?: boolean;
}

/**
 * Complete intermediate configuration model for a single Cisco device.
 */
export interface DeviceConfigModel {
  deviceId: string;
  hostname: string;
  deviceName?: string;
  deviceType: CiscoDeviceType;
  hardwareModel: CiscoHardwareModel;
  ipRoutingEnabled: boolean;
  vlans: VlanConfigModel[];
  spanningTree?: SpanningTreeConfigModel;
  interfaces: InterfaceConfigModel[];
  svis: SviConfigModel[];
  loopbacks: LoopbackConfigModel[];
  tunnels: TunnelConfigModel[];
  ospf?: OspfConfigModel;
  bgp?: BgpConfigModel;
  staticRoutes: StaticRouteConfigModel[];
  acls: AclConfigModel[];
  qos?: QosConfigModel;
  crypto?: CryptoConfigModel;
  banners: string[];
  lines: LineConfigModel[];
}
