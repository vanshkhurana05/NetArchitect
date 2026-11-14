/**
 * VLAN Engine Types.
 */
import type { VlanItem, VlanPlan, VlanRequestItem } from "../../contracts/vlan.js";
import type { VlsmRequest } from "../../contracts/vlsm.js";

export const NATIVE_VLAN_ID = 99;
export const DEFAULT_VLAN_START_ID = 10;
export const DEFAULT_VLAN_INCREMENT = 10;

export interface VlanAssignment extends VlanItem {
  hosts: number;
  department: string;
  siteIds: string[];
  isManagement: boolean;
}

export interface AccessPortAssignment {
  deviceId: string;
  portRange: string;
  vlanId: number;
  vlanName: string;
}

export interface VlanPlanningResult {
  vlanPlan: VlanPlan;
  assignments: VlanAssignment[];
  accessPorts: AccessPortAssignment[];
  vlsmRequests: VlsmRequest[];
}

export interface VlanPlannerOptions {
  startVlanId?: number;
  increment?: number;
  nativeVlanId?: number;
  managementVlanId?: number;
}
