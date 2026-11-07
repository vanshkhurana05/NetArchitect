import { describe, it, expect } from "vitest";
import { generateMarkdownReport } from "../../../src/exporters/report.exporter.js";
import type { ReportData } from "../../../src/exporters/report.exporter.js";

describe("Markdown Design Report Generator", () => {
  const sampleReportData: ReportData = {
    scenarioName: "Campus LAN",
    profileKind: "campus-lan",
    source: "preset",
    rawInput: {
      buildings: [
        { id: "BLD-A", name: "Engineering", endpoints: 620 },
        { id: "BLD-B", name: "Library", endpoints: 580 },
        { id: "BLD-C", name: "Admin", endpoints: 400 },
      ],
    },
    topology: {
      tier: "collapsed-core",
      sites: [
        { id: "SITE-CORE", label: "MDF", kind: "building", deviceIds: ["CORE-01"] },
      ],
      devices: [
        { id: "CORE-01", name: "Core Switch 1", role: "core-switch", siteId: "SITE-CORE", portCount: 24 },
      ],
      links: [
        {
          id: "LINK-1",
          aDeviceId: "CORE-01",
          bDeviceId: "DIST-A",
          kind: "physical",
          bandwidthMbps: 10000,
          phys: {
            runMeters: 85,
            standard: "10GBASE-SR",
            spec: {
              medium: "om4",
              standard: "10GBASE-SR",
              wavelengthNm: 850,
              maxReachMeters: 400,
            },
          },
        },
      ],
      explanations: [],
    },
    vlanPlan: {
      items: [
        { vlanId: 10, name: "MGMT", purpose: "management", subnetName: "MGMT-NET" },
        { vlanId: 20, name: "STAFF", purpose: "staff", subnetName: "STAFF-NET" },
      ],
      trunks: [],
      svis: [],
      explanations: [],
    },
    vlsmPlan: {
      root: { baseNetwork: "10.20.0.0/16", prefix: 16 },
      subnets: [
        {
          name: "STAFF-NET",
          index: 0,
          network: "10.20.0.0",
          prefix: 22,
          mask: "255.255.252.0",
          wildcard: "0.0.3.255",
          broadcast: "10.20.3.255",
          firstHost: "10.20.0.1",
          lastHost: "10.20.3.254",
          gateway: "10.20.0.1",
          totalAddresses: 1024,
          requestedHosts: 650,
          capacity: 1022,
          utilization: 0.636,
        },
      ],
      efficiency: 0.85,
      explanations: [],
    },
    routingPlan: {
      asNumber: 65001,
      protocol: "single-area-ospf",
      areas: [
        {
          areaId: 0,
          label: "Backbone Area 0",
          siteIds: ["SITE-CORE"],
          networks: [{ cidr: "10.20.0.0/22", wildcard: "0.0.3.255" }],
        },
      ],
      bgp: [],
      vpnTunnels: [],
      explanations: [],
    },
    deviceConfigs: [
      {
        deviceId: "CORE-01",
        deviceName: "Campus Core Switch 01",
        fileName: "exports/campus-lan/CORE-01.ios",
        lines: ["hostname CORE-01", "ip routing", "end"],
      },
    ],
    decisions: [
      {
        decisionId: "DEC-001",
        ruleId: "MEDIA.02",
        module: "media",
        selected: "OM4 Multimode Fiber",
        inputs: { runMeters: 85 },
        rationale: ["Backbone run is within the 400m attenuation limit of OM4 MMF."],
        warnings: [],
        assumptions: ["Standard 850nm VCSEL laser transceiver"],
        references: ["IEEE 802.3ae"],
      },
    ],
    verificationStatus: {
      passed: true,
      checks: [
        { id: "V-01", name: "Zero Overlap Invariant", passed: true, detail: "All subnets non-overlapping." },
        { id: "V-02", name: "Host Capacity Sizing", passed: true, detail: "All subnets satisfy host demands." },
      ],
    },
  };

  it("renders all 12 mandatory report sections in the Markdown report", () => {
    const report = generateMarkdownReport(sampleReportData);

    // Verify all 12 numbered sections exist in the rendered markdown
    expect(report).toContain("## 1. Executive Summary");
    expect(report).toContain("## 2. Network Profile");
    expect(report).toContain("## 3. Architecture Overview");
    expect(report).toContain("## 4. Device Inventory");
    expect(report).toContain("## 5. Physical Media Recommendations");
    expect(report).toContain("## 6. 802.1Q VLAN Allocation & Trunking Etiquette");
    expect(report).toContain("## 7. VLSM Address Allocation Plan");
    expect(report).toContain("## 8. Layer 3 Routing Decisions");
    expect(report).toContain("## 9. Explainable Engineering Justifications");
    expect(report).toContain("## 10. Configuration Artifact Inventory");
    expect(report).toContain("## 11. Documented Assumptions & Technical Limitations");
    expect(report).toContain("## 12. Fail-Closed Verification Audit Trail");
  });

  it("formats structured data tables without placeholder text", () => {
    const report = generateMarkdownReport(sampleReportData);

    // Verify content from each section
    expect(report).toContain("CORE-01");
    expect(report).toContain("10.20.0.0");
    expect(report).toContain("0.0.3.255");
    expect(report).toContain("OM4 Multimode Fiber");
    expect(report).toContain("IEEE 802.3ae");
    expect(report).toContain("V-01");
    expect(report).toContain("Zero Overlap Invariant");
    expect(report).toContain("exports/campus-lan/CORE-01.ios");
  });
});
