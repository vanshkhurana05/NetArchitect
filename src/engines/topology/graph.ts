/**
 * Graph data structure representing network nodes, interface-to-interface
 * connections, and site containers.
 */
import type { Site, Topology, Device, Link } from "../../contracts/topology.js";
import type { ExplainRecord } from "../../contracts/explain.js";
import type { TopologyNode, TopologyEdge, TopologyGraph } from "./types.js";

export class NetworkGraph implements TopologyGraph {
  public readonly nodes: Map<string, TopologyNode> = new Map();
  public readonly edges: Map<string, TopologyEdge> = new Map();
  public readonly sites: Map<string, Site> = new Map();
  public readonly explanations: ExplainRecord[] = [];
  public tier: "collapsed-core" | "three-tier" = "collapsed-core";

  public addSite(site: Site): void {
    this.sites.set(site.id, { ...site, deviceIds: [...site.deviceIds] });
  }

  public getSite(id: string): Site | undefined {
    return this.sites.get(id);
  }

  public addNode(node: TopologyNode): void {
    this.nodes.set(node.id, {
      ...node,
      interfaces: node.interfaces.map((i) => ({ ...i })),
    });

    const site = this.sites.get(node.siteId);
    if (site && !site.deviceIds.includes(node.id)) {
      site.deviceIds.push(node.id);
    }
  }

  public getNode(id: string): TopologyNode | undefined {
    return this.nodes.get(id);
  }

  public hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  public addEdge(edge: TopologyEdge): void {
    this.edges.set(edge.id, { ...edge });

    // Link interface references on nodes
    const nodeA = this.nodes.get(edge.aDeviceId);
    if (nodeA) {
      const ifaceA = nodeA.interfaces.find((i) => i.name === edge.aInterface);
      if (ifaceA) {
        ifaceA.connectedToLinkId = edge.id;
        ifaceA.connectedToDeviceId = edge.bDeviceId;
        ifaceA.connectedToInterface = edge.bInterface;
      }
    }

    const nodeB = this.nodes.get(edge.bDeviceId);
    if (nodeB) {
      const ifaceB = nodeB.interfaces.find((i) => i.name === edge.bInterface);
      if (ifaceB) {
        ifaceB.connectedToLinkId = edge.id;
        ifaceB.connectedToDeviceId = edge.aDeviceId;
        ifaceB.connectedToInterface = edge.aInterface;
      }
    }
  }

  public getEdge(id: string): TopologyEdge | undefined {
    return this.edges.get(id);
  }

  public getConnectedEdges(deviceId: string): TopologyEdge[] {
    const result: TopologyEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.aDeviceId === deviceId || edge.bDeviceId === deviceId) {
        result.push(edge);
      }
    }
    return result;
  }

  public getNeighbors(deviceId: string): string[] {
    const neighbors = new Set<string>();
    for (const edge of this.edges.values()) {
      if (edge.aDeviceId === deviceId) neighbors.add(edge.bDeviceId);
      if (edge.bDeviceId === deviceId) neighbors.add(edge.aDeviceId);
    }
    return Array.from(neighbors);
  }

  public addExplanation(record: ExplainRecord): void {
    this.explanations.push(record);
  }

  /**
   * Converts the internal NetworkGraph representation into the canonical
   * intermediate Topology model required by downstream engines.
   */
  public toTopology(): Topology {
    return {
      tier: this.tier,
      sites: Array.from(this.sites.values()),
      devices: Array.from(this.nodes.values()).map((node) => {
        const dev: Device = {
          id: node.id,
          name: node.name,
          role: node.role,
          siteId: node.siteId,
        };
        if (node.mgmtIp !== undefined) dev.mgmtIp = node.mgmtIp;
        if (node.portCount !== undefined) dev.portCount = node.portCount;
        if (node.poe !== undefined) dev.poe = node.poe;
        return dev;
      }),
      links: Array.from(this.edges.values()).map((edge) => {
        const link: Link = {
          id: edge.id,
          aDeviceId: edge.aDeviceId,
          bDeviceId: edge.bDeviceId,
          kind: edge.kind,
          bandwidthMbps: edge.bandwidthMbps,
        };
        if (edge.phys !== undefined) link.phys = edge.phys;
        if (edge.latencyMs !== undefined) link.latencyMs = edge.latencyMs;
        if (edge.betweenSites !== undefined) link.betweenSites = edge.betweenSites;
        return link;
      }),
      explanations: [...this.explanations],
    };
  }

  public toGraphSnapshot(): object {
    return {
      tier: this.tier,
      sites: Array.from(this.sites.values()),
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      explanations: [...this.explanations],
    };
  }
}
