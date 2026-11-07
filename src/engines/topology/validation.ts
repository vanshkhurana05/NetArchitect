/**
 * Graph validation functions for network topologies.
 * Enforces structural invariants, interface uniqueness, port capacities,
 * and graph connectivity.
 * OWNER: Topology specialist agent (src/engines/topology/).
 */
import type { Topology } from "../../contracts/topology.js";
import type { NetworkGraph } from "./graph.js";
import type { TopologyEdge, TopologyNode } from "./types.js";

export interface TopologyValidationIssue {
  code:
    | "DUPLICATE_DEVICE_ID"
    | "INVALID_LINK_ENDPOINT"
    | "INVALID_INTERFACE_REF"
    | "ORPHAN_DEVICE"
    | "DISCONNECTED_COMPONENT"
    | "LACK_OF_REDUNDANCY"
    | "PORT_CAPACITY_EXCEEDED";
  severity: "error" | "warning";
  message: string;
  entityId?: string;
}

export interface TopologyValidationResult {
  valid: boolean;
  errors: TopologyValidationIssue[];
  warnings: TopologyValidationIssue[];
}

/**
 * Validates a NetworkGraph or canonical Topology against structural and capacity invariants.
 */
export function validateTopologyGraph(
  graphOrTopology: NetworkGraph | Topology,
): TopologyValidationResult {
  const errors: TopologyValidationIssue[] = [];
  const warnings: TopologyValidationIssue[] = [];

  // Extract nodes and edges
  let rawNodes: Array<{ id: string; name: string; role: string; portCount?: number }>;
  let rawEdges: Array<{
    id: string;
    aDeviceId: string;
    bDeviceId: string;
    aInterface?: string;
    bInterface?: string;
    kind: string;
  }>;

  if ("nodes" in graphOrTopology && graphOrTopology.nodes instanceof Map) {
    rawNodes = Array.from((graphOrTopology as NetworkGraph).nodes.values());
    rawEdges = Array.from((graphOrTopology as NetworkGraph).edges.values());
  } else {
    rawNodes = (graphOrTopology as Topology).devices;
    rawEdges = (graphOrTopology as Topology).links.map((l) => ({
      ...l,
      aInterface: (l as TopologyEdge).aInterface,
      bInterface: (l as TopologyEdge).bInterface,
    }));
  }

  // 1. Duplicate device IDs check
  const seenDeviceIds = new Set<string>();
  for (const node of rawNodes) {
    if (seenDeviceIds.has(node.id)) {
      errors.push({
        code: "DUPLICATE_DEVICE_ID",
        severity: "error",
        message: `Duplicate device identifier found: "${node.id}".`,
        entityId: node.id,
      });
    }
    seenDeviceIds.add(node.id);
  }

  // 2. Invalid link endpoints check
  const deviceIdSet = new Set(rawNodes.map((n) => n.id));
  for (const edge of rawEdges) {
    if (!deviceIdSet.has(edge.aDeviceId)) {
      errors.push({
        code: "INVALID_LINK_ENDPOINT",
        severity: "error",
        message: `Link "${edge.id}" references non-existent endpoint device "${edge.aDeviceId}".`,
        entityId: edge.id,
      });
    }
    if (!deviceIdSet.has(edge.bDeviceId)) {
      errors.push({
        code: "INVALID_LINK_ENDPOINT",
        severity: "error",
        message: `Link "${edge.id}" references non-existent endpoint device "${edge.bDeviceId}".`,
        entityId: edge.id,
      });
    }
    if (edge.aDeviceId === edge.bDeviceId) {
      errors.push({
        code: "INVALID_LINK_ENDPOINT",
        severity: "error",
        message: `Link "${edge.id}" has self-referential endpoints ("${edge.aDeviceId}").`,
        entityId: edge.id,
      });
    }
  }

  // 3. Invalid interface references check (collision on same interface)
  const interfaceUsage = new Map<string, string>(); // `${deviceId}:${interface}` -> linkId
  for (const edge of rawEdges) {
    if (edge.aInterface) {
      const keyA = `${edge.aDeviceId}:${edge.aInterface}`;
      if (interfaceUsage.has(keyA)) {
        errors.push({
          code: "INVALID_INTERFACE_REF",
          severity: "error",
          message: `Interface collision: ${keyA} is already assigned to link "${interfaceUsage.get(keyA)}" and cannot be reused on link "${edge.id}".`,
          entityId: edge.id,
        });
      } else {
        interfaceUsage.set(keyA, edge.id);
      }
    }

    if (edge.bInterface) {
      const keyB = `${edge.bDeviceId}:${edge.bInterface}`;
      if (interfaceUsage.has(keyB)) {
        errors.push({
          code: "INVALID_INTERFACE_REF",
          severity: "error",
          message: `Interface collision: ${keyB} is already assigned to link "${interfaceUsage.get(keyB)}" and cannot be reused on link "${edge.id}".`,
          entityId: edge.id,
        });
      } else {
        interfaceUsage.set(keyB, edge.id);
      }
    }
  }

  // Adjacency build for graph analysis
  const adjacency = new Map<string, Set<string>>();
  for (const node of rawNodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of rawEdges) {
    if (deviceIdSet.has(edge.aDeviceId) && deviceIdSet.has(edge.bDeviceId)) {
      adjacency.get(edge.aDeviceId)?.add(edge.bDeviceId);
      adjacency.get(edge.bDeviceId)?.add(edge.aDeviceId);
    }
  }

  // 4. Orphan devices check
  for (const [nodeId, neighbors] of adjacency.entries()) {
    if (neighbors.size === 0) {
      errors.push({
        code: "ORPHAN_DEVICE",
        severity: "error",
        message: `Device "${nodeId}" has no connected links (orphan node).`,
        entityId: nodeId,
      });
    }
  }

  // 5. Unexpected disconnected components check (BFS connectivity)
  if (rawNodes.length > 0) {
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const node of rawNodes) {
      if (!visited.has(node.id)) {
        const currentComponent: string[] = [];
        const queue: string[] = [node.id];
        visited.add(node.id);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          currentComponent.push(curr);
          const nbrs = adjacency.get(curr) ?? new Set();
          for (const nbr of nbrs) {
            if (!visited.has(nbr)) {
              visited.add(nbr);
              queue.push(nbr);
            }
          }
        }
        components.push(currentComponent);
      }
    }

    if (components.length > 1) {
      errors.push({
        code: "DISCONNECTED_COMPONENT",
        severity: "error",
        message: `Topology is partitioned into ${components.length} disconnected components: [${components.map((c) => c.join(",")).join(" | ")}].`,
      });
    }
  }

  // 6. Redundant link availability check
  // For core switches or distribution switches in campus, verify degree >= 2
  for (const node of rawNodes) {
    if (node.role === "core-switch") {
      const linksCount = adjacency.get(node.id)?.size ?? 0;
      if (linksCount < 2) {
        warnings.push({
          code: "LACK_OF_REDUNDANCY",
          severity: "warning",
          message: `Core switch "${node.id}" has only ${linksCount} connection(s); minimum 2 recommended for high availability.`,
          entityId: node.id,
        });
      }
    }
  }

  // 7. Interface capacity violations check
  const linksPerDevice = new Map<string, number>();
  for (const edge of rawEdges) {
    linksPerDevice.set(edge.aDeviceId, (linksPerDevice.get(edge.aDeviceId) ?? 0) + 1);
    linksPerDevice.set(edge.bDeviceId, (linksPerDevice.get(edge.bDeviceId) ?? 0) + 1);
  }

  for (const node of rawNodes) {
    if (node.portCount !== undefined && node.portCount > 0) {
      const activeLinks = linksPerDevice.get(node.id) ?? 0;
      if (activeLinks > node.portCount) {
        errors.push({
          code: "PORT_CAPACITY_EXCEEDED",
          severity: "error",
          message: `Device "${node.id}" has ${activeLinks} active links, exceeding its physical capacity of ${node.portCount} ports.`,
          entityId: node.id,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
