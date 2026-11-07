/**
 * Topology serialization and export utility.
 * Generates JSON snapshots and Graphviz DOT representations for visual inspection.
 * OWNER: Topology specialist agent (src/engines/topology/).
 */
import type { Topology } from "../../contracts/topology.js";

/**
 * Renders a Topology structure into a Graphviz DOT script for graphical visualization.
 */
export function exportTopologyToDot(topology: Topology): string {
  const lines: string[] = [];
  lines.push(`graph NetworkTopology {`);
  lines.push(`  rankdir=TB;`);
  lines.push(`  node [shape=box, style="filled,rounded", fontname="Helvetica"];`);
  lines.push(`  edge [fontname="Helvetica", fontsize=10];`);
  lines.push(`  label="Network Topology (${topology.tier})";`);
  lines.push(`  labelloc=t;`);
  lines.push("");

  // Subgraphs for sites
  for (const site of topology.sites) {
    lines.push(`  subgraph cluster_${site.id.replace(/[^a-zA-Z0-9]/g, "_")} {`);
    lines.push(`    label="${site.label}";`);
    lines.push(`    style=dashed;`);
    lines.push(`    color=gray;`);

    for (const devId of site.deviceIds) {
      const dev = topology.devices.find((d) => d.id === devId);
      const role = dev?.role ?? "unknown";
      let fillcolor = "#E0E0E0";
      if (role === "core-switch") fillcolor = "#BBDEFB";
      else if (role === "distribution-switch") fillcolor = "#C8E6C9";
      else if (role === "access-switch") fillcolor = "#FFF9C4";
      else if (role.includes("router")) fillcolor = "#FFCCBC";
      else if (role.includes("cloud")) fillcolor = "#E1BEE7";

      lines.push(`    "${devId}" [label="${dev?.name ?? devId}\\n[${role}]", fillcolor="${fillcolor}"];`);
    }

    lines.push(`  }`);
    lines.push("");
  }

  // Links
  for (const link of topology.links) {
    let style = "solid";
    let color = "black";
    if (link.kind === "evpl") {
      color = "blue";
    } else if (link.kind === "ipsec-tunnel") {
      style = "dashed";
      color = "purple";
    } else if (link.kind === "bgp-session") {
      style = "dotted";
      color = "red";
    }

    const label = `${link.bandwidthMbps}M${link.phys ? `\\n${link.phys.standard}` : ""}`;
    lines.push(`  "${link.aDeviceId}" -- "${link.bDeviceId}" [label="${label}", style="${style}", color="${color}"];`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Serializes a Topology into a formatted JSON string.
 */
export function exportTopologyToJson(topology: Topology): string {
  return JSON.stringify(topology, null, 2);
}
