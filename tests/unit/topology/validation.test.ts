import { describe, it, expect } from "vitest";
import { validateTopologyGraph } from "../../../src/engines/topology/validation.js";
import { NetworkGraph } from "../../../src/engines/topology/graph.js";
import type { Topology } from "../../../src/contracts/topology.js";

describe("Topology Graph Validation", () => {
  it("validates a healthy graph without errors", () => {
    const graph = new NetworkGraph();
    graph.addSite({ id: "SITE-1", label: "Main Site", kind: "building", deviceIds: [] });
    graph.addNode({
      id: "DEV-1",
      name: "Switch 1",
      role: "core-switch",
      siteId: "SITE-1",
      portCount: 24,
      interfaces: [{ name: "GigabitEthernet1/0/1", speedMbps: 1000, kind: "copper" }],
    });
    graph.addNode({
      id: "DEV-2",
      name: "Switch 2",
      role: "access-switch",
      siteId: "SITE-1",
      portCount: 24,
      interfaces: [{ name: "GigabitEthernet1/0/1", speedMbps: 1000, kind: "copper" }],
    });
    graph.addEdge({
      id: "LINK-1-2",
      aDeviceId: "DEV-1",
      bDeviceId: "DEV-2",
      aInterface: "GigabitEthernet1/0/1",
      bInterface: "GigabitEthernet1/0/1",
      kind: "physical",
      bandwidthMbps: 1000,
    });

    const res = validateTopologyGraph(graph);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("detects duplicate device IDs", () => {
    const rawTopology: Topology = {
      tier: "collapsed-core",
      sites: [{ id: "S1", label: "Site 1", kind: "building", deviceIds: ["D1", "D1"] }],
      devices: [
        { id: "D1", name: "Core 1", role: "core-switch", siteId: "S1" },
        { id: "D1", name: "Core Duplicate", role: "core-switch", siteId: "S1" },
      ],
      links: [],
      explanations: [],
    };

    const res = validateTopologyGraph(rawTopology);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "DUPLICATE_DEVICE_ID")).toBe(true);
  });

  it("detects invalid link endpoints (non-existent device)", () => {
    const rawTopology: Topology = {
      tier: "collapsed-core",
      sites: [{ id: "S1", label: "Site 1", kind: "building", deviceIds: ["D1"] }],
      devices: [{ id: "D1", name: "Switch 1", role: "core-switch", siteId: "S1" }],
      links: [
        {
          id: "L1",
          aDeviceId: "D1",
          bDeviceId: "NON_EXISTENT_DEV",
          kind: "physical",
          bandwidthMbps: 1000,
        },
      ],
      explanations: [],
    };

    const res = validateTopologyGraph(rawTopology);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "INVALID_LINK_ENDPOINT")).toBe(true);
  });

  it("detects interface collisions on the same physical port", () => {
    const rawTopology: Topology = {
      tier: "collapsed-core",
      sites: [{ id: "S1", label: "Site 1", kind: "building", deviceIds: ["D1", "D2", "D3"] }],
      devices: [
        { id: "D1", name: "Core 1", role: "core-switch", siteId: "S1" },
        { id: "D2", name: "Dist 1", role: "distribution-switch", siteId: "S1" },
        { id: "D3", name: "Dist 2", role: "distribution-switch", siteId: "S1" },
      ],
      links: [
        {
          id: "L1",
          aDeviceId: "D1",
          bDeviceId: "D2",
          kind: "physical",
          bandwidthMbps: 1000,
        },
        {
          id: "L2",
          aDeviceId: "D1",
          bDeviceId: "D3",
          kind: "physical",
          bandwidthMbps: 1000,
        },
      ],
      explanations: [],
    };

    // Give both links the exact same interface on D1
    const edge1: any = { ...rawTopology.links[0], aInterface: "GigabitEthernet1/0/1" };
    const edge2: any = { ...rawTopology.links[1], aInterface: "GigabitEthernet1/0/1" };
    rawTopology.links = [edge1, edge2];

    const res = validateTopologyGraph(rawTopology);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "INVALID_INTERFACE_REF")).toBe(true);
  });

  it("detects orphan devices with zero connected links", () => {
    const rawTopology: Topology = {
      tier: "collapsed-core",
      sites: [{ id: "S1", label: "Site 1", kind: "building", deviceIds: ["D1", "D2"] }],
      devices: [
        { id: "D1", name: "Core 1", role: "core-switch", siteId: "S1" },
        { id: "D2", name: "Orphan Device", role: "access-switch", siteId: "S1" },
      ],
      links: [], // No links
      explanations: [],
    };

    const res = validateTopologyGraph(rawTopology);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "ORPHAN_DEVICE")).toBe(true);
  });

  it("detects partitioned disconnected components in graph", () => {
    const rawTopology: Topology = {
      tier: "collapsed-core",
      sites: [{ id: "S1", label: "Site 1", kind: "building", deviceIds: ["A1", "A2", "B1", "B2"] }],
      devices: [
        { id: "A1", name: "A1", role: "core-switch", siteId: "S1" },
        { id: "A2", name: "A2", role: "access-switch", siteId: "S1" },
        { id: "B1", name: "B1", role: "core-switch", siteId: "S1" },
        { id: "B2", name: "B2", role: "access-switch", siteId: "S1" },
      ],
      links: [
        { id: "L-A", aDeviceId: "A1", bDeviceId: "A2", kind: "physical", bandwidthMbps: 1000 },
        { id: "L-B", aDeviceId: "B1", bDeviceId: "B2", kind: "physical", bandwidthMbps: 1000 },
      ],
      explanations: [],
    };

    const res = validateTopologyGraph(rawTopology);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "DISCONNECTED_COMPONENT")).toBe(true);
  });

  it("detects port capacity violations", () => {
    const rawTopology: Topology = {
      tier: "collapsed-core",
      sites: [{ id: "S1", label: "Site 1", kind: "building", deviceIds: ["D1", "D2", "D3"] }],
      devices: [
        { id: "D1", name: "Small Switch", role: "access-switch", siteId: "S1", portCount: 1 }, // Only 1 port!
        { id: "D2", name: "Device 2", role: "core-switch", siteId: "S1", portCount: 24 },
        { id: "D3", name: "Device 3", role: "core-switch", siteId: "S1", portCount: 24 },
      ],
      links: [
        { id: "L1", aDeviceId: "D1", bDeviceId: "D2", kind: "physical", bandwidthMbps: 1000 },
        { id: "L2", aDeviceId: "D1", bDeviceId: "D3", kind: "physical", bandwidthMbps: 1000 }, // 2nd link exceeds capacity of 1
      ],
      explanations: [],
    };

    const res = validateTopologyGraph(rawTopology);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "PORT_CAPACITY_EXCEEDED")).toBe(true);
  });
});
