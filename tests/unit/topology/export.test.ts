import { describe, it, expect } from "vitest";
import { exportTopologyToDot, exportTopologyToJson } from "../../../src/engines/topology/export.js";
import type { Topology } from "../../../src/contracts/topology.js";

describe("Topology Exporter", () => {
  const sampleTopology: Topology = {
    tier: "collapsed-core",
    sites: [
      { id: "SITE-1", label: "Headquarters", kind: "building", deviceIds: ["CORE-01", "DIST-01"] },
    ],
    devices: [
      { id: "CORE-01", name: "Core Switch", role: "core-switch", siteId: "SITE-1" },
      { id: "DIST-01", name: "Dist Switch", role: "distribution-switch", siteId: "SITE-1" },
    ],
    links: [
      {
        id: "LINK-1",
        aDeviceId: "CORE-01",
        bDeviceId: "DIST-01",
        kind: "physical",
        bandwidthMbps: 10000,
      },
    ],
    explanations: [],
  };

  it("exports valid Graphviz DOT format with clusters and links", () => {
    const dot = exportTopologyToDot(sampleTopology);
    expect(dot).toContain("graph NetworkTopology");
    expect(dot).toContain('subgraph cluster_SITE_1');
    expect(dot).toContain('"CORE-01"');
    expect(dot).toContain('"DIST-01"');
    expect(dot).toContain('"CORE-01" -- "DIST-01"');
  });

  it("serializes to valid JSON", () => {
    const jsonStr = exportTopologyToJson(sampleTopology);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.tier).toBe("collapsed-core");
    expect(parsed.devices.length).toBe(2);
    expect(parsed.links.length).toBe(1);
  });
});
