/**
 * Cisco IOS Configuration Renderer.
 * Translates Intermediate Device Configuration Models into copy-paste-ready Cisco CLI lines.
 * Stage 2 of the two-stage configuration architecture.
 */
import type { DeviceConfigModel, InterfaceConfigModel } from "./model.js";

/**
 * Renders an Intermediate Device Configuration Model into an array of Cisco IOS CLI lines.
 */
export function renderCiscoIos(model: DeviceConfigModel): string[] {
  const lines: string[] = [];

  // Header & System Settings
  lines.push(`! NetArchitect Generated Cisco IOS Configuration`);
  lines.push(`! Device: ${model.deviceName ?? model.hostname} (${model.deviceId})`);
  lines.push(`! Platform: ${model.hardwareModel} | Role: ${model.deviceType}`);
  lines.push(`! Generated: ${new Date().toISOString()}`);
  lines.push(`!`);
  lines.push(`version 15.2`);
  lines.push(`service timestamps debug datetime msec`);
  lines.push(`service timestamps log datetime msec`);
  lines.push(`service password-encryption`);
  lines.push(`!`);
  lines.push(`hostname ${model.hostname}`);
  lines.push(`!`);
  lines.push(`no ip domain-lookup`);

  if (model.ipRoutingEnabled) {
    lines.push(`ip routing`);
  }
  lines.push(`!`);

  // Spanning Tree (RSTP / rapid-pvst)
  if (model.spanningTree) {
    lines.push(`! --- Spanning Tree Architecture (RSTP) ---`);
    lines.push(`spanning-tree mode ${model.spanningTree.mode}`);
    if (model.spanningTree.priority !== undefined) {
      lines.push(`spanning-tree vlan 1-4094 priority ${model.spanningTree.priority}`);
    }
    if (model.spanningTree.portfastDefault) {
      lines.push(`spanning-tree portfast default`);
    }
    if (model.spanningTree.bpduguardDefault) {
      lines.push(`spanning-tree portfast bpduguard default`);
    }
    lines.push(`!`);
  }

  // VLAN Database
  if (model.vlans.length > 0) {
    lines.push(`! --- 802.1Q VLAN Database ---`);
    for (const vlan of model.vlans) {
      lines.push(`vlan ${vlan.vlanId}`);
      lines.push(` name ${vlan.name}`);
    }
    lines.push(`!`);
  }

  // DiffServ QoS (Class-Maps & Policy-Maps)
  if (model.qos) {
    lines.push(`! --- DiffServ QoS Queuing ---`);
    for (const c of model.qos.classes) {
      lines.push(`class-map match-all ${c.name}`);
      lines.push(` match ip dscp ${c.dscp}`);
      lines.push(`!`);
    }
    for (const p of model.qos.policies) {
      lines.push(`policy-map ${p.name}`);
      for (const pc of p.classes) {
        lines.push(` class ${pc.name}`);
        if (pc.priorityPct !== undefined) {
          lines.push(`  priority percent ${pc.priorityPct}`);
        } else if (pc.bandwidthPct !== undefined) {
          lines.push(`  bandwidth percent ${pc.bandwidthPct}`);
        }
      }
      lines.push(` class class-default`);
      lines.push(`  bandwidth percent 10`);
      lines.push(`!`);
    }
  }

  // Physical Interfaces
  if (model.interfaces.length > 0) {
    lines.push(`! --- Interface Configurations ---`);
    for (const iface of model.interfaces) {
      renderInterface(iface, model.hardwareModel, lines);
    }
  }

  // Switch Virtual Interfaces (SVIs)
  if (model.svis.length > 0) {
    lines.push(`! --- Switch Virtual Interfaces (SVIs) ---`);
    for (const svi of model.svis) {
      lines.push(`interface Vlan${svi.vlanId}`);
      if (svi.description) lines.push(` description ${svi.description}`);
      lines.push(` ip address ${svi.ipAddress} ${svi.subnetMask}`);
      lines.push(` no shutdown`);
      lines.push(`!`);
    }
  }

  // Loopback Interfaces
  if (model.loopbacks.length > 0) {
    lines.push(`! --- Loopback Interfaces ---`);
    for (const loop of model.loopbacks) {
      lines.push(`interface Loopback${loop.id}`);
      if (loop.description) lines.push(` description ${loop.description}`);
      lines.push(` ip address ${loop.ipAddress} ${loop.subnetMask}`);
      lines.push(`!`);
    }
  }

  // Tunnel Interfaces (IPsec)
  if (model.tunnels.length > 0) {
    lines.push(`! --- IPsec Tunnel Interfaces ---`);
    for (const tun of model.tunnels) {
      lines.push(`interface Tunnel${tun.id}`);
      if (tun.description) lines.push(` description ${tun.description}`);
      if (tun.ipAddress && tun.subnetMask) {
        lines.push(` ip address ${tun.ipAddress} ${tun.subnetMask}`);
      }
      lines.push(` tunnel source ${tun.sourceInterface}`);
      lines.push(` tunnel destination ${tun.destinationIp}`);
      lines.push(` tunnel mode ${tun.mode === "ipsec-ipv4" ? "ipsec ipv4" : "gre ip"}`);
      if (tun.ipsecProfile) {
        lines.push(` tunnel protection ipsec profile ${tun.ipsecProfile}`);
      }
      lines.push(`!`);
    }
  }

  // Static Routes
  if (model.staticRoutes.length > 0) {
    lines.push(`! --- Static & Floating Routes ---`);
    for (const r of model.staticRoutes) {
      const dist = r.distance !== undefined ? ` ${r.distance}` : "";
      lines.push(`ip route ${r.prefix} ${r.netmask} ${r.nextHop}${dist}`);
    }
    lines.push(`!`);
  }

  // Access Control Lists (ACLs)
  if (model.acls.length > 0) {
    lines.push(`! --- Access Control Lists ---`);
    for (const acl of model.acls) {
      lines.push(`ip access-list ${acl.type} ${acl.name}`);
      for (const rule of acl.rules) {
        if (rule.remark) lines.push(` remark ${rule.remark}`);
        if (acl.type === "standard") {
          const src = rule.source === "any" ? "any" : `${rule.source}${rule.sourceWildcard ? ` ${rule.sourceWildcard}` : ""}`;
          lines.push(` ${rule.action} ${src}`);
        } else {
          const src = rule.source === "any" ? "any" : `${rule.source}${rule.sourceWildcard ? ` ${rule.sourceWildcard}` : ""}`;
          const dst = rule.destination === "any" ? "any" : `${rule.destination}${rule.destinationWildcard ? ` ${rule.destinationWildcard}` : ""}`;
          lines.push(` ${rule.action} ${rule.protocol} ${src} ${dst}`);
        }
      }
      lines.push(`!`);
    }
  }

  // OSPF Routing
  if (model.ospf) {
    lines.push(`! --- OSPF Process Configuration ---`);
    lines.push(`router ospf ${model.ospf.processId}`);
    lines.push(` router-id ${model.ospf.routerId}`);
    lines.push(` log-adjacency-changes`);

    for (const net of model.ospf.networks) {
      lines.push(` network ${net.network} ${net.wildcard} area ${net.area}`);
    }

    if (model.ospf.summaryRanges) {
      for (const range of model.ospf.summaryRanges) {
        lines.push(` area ${range.area} range ${range.network} ${range.netmask}`);
      }
    }
    lines.push(`!`);
  }

  // BGP Routing
  if (model.bgp) {
    lines.push(`! --- BGP Process Configuration ---`);
    lines.push(`router bgp ${model.bgp.asNumber}`);
    lines.push(` bgp router-id ${model.bgp.routerId}`);
    lines.push(` bgp log-neighbor-changes`);

    for (const n of model.bgp.neighbors) {
      lines.push(` neighbor ${n.ip} remote-as ${n.remoteAs}`);
      if (n.description) lines.push(` neighbor ${n.ip} description ${n.description}`);
    }

    if (model.bgp.aggregates) {
      for (const agg of model.bgp.aggregates) {
        lines.push(` aggregate-address ${agg.network} ${agg.netmask}${agg.summaryOnly ? " summary-only" : ""}`);
      }
    }
    lines.push(`!`);
  }

  // Line Configurations
  lines.push(`! --- Management Line Hardening ---`);
  lines.push(`line con 0`);
  lines.push(` logging synchronous`);
  lines.push(` login local`);
  lines.push(`!`);
  lines.push(`line vty 0 4`);
  lines.push(` transport input ssh`);
  lines.push(` access-class MGMT-VTY-ACCESS in`);
  lines.push(` login local`);
  lines.push(`line vty 5 15`);
  lines.push(` transport input ssh`);
  lines.push(` access-class MGMT-VTY-ACCESS in`);
  lines.push(` login local`);
  lines.push(`!`);
  lines.push(`end`);

  return lines;
}

function renderInterface(
  iface: InterfaceConfigModel,
  hardwareModel: string,
  lines: string[],
): void {
  lines.push(`interface ${iface.name}`);
  if (iface.description) lines.push(` description ${iface.description}`);

  if (iface.mode === "trunk") {
    // Packet Tracer requirement: Catalyst 3560 requires dot1q encapsulation command
    if (hardwareModel.includes("3560") || hardwareModel.includes("3650")) {
      lines.push(` switchport trunk encapsulation dot1q`);
    }
    lines.push(` switchport mode trunk`);
    if (iface.trunkAllowedVlans && iface.trunkAllowedVlans.length > 0) {
      lines.push(` switchport trunk allowed vlan ${iface.trunkAllowedVlans.join(",")}`);
    }
    if (iface.nativeVlan !== undefined) {
      lines.push(` switchport trunk native vlan ${iface.nativeVlan}`);
    }
  } else if (iface.mode === "access") {
    lines.push(` switchport mode access`);
    if (iface.accessVlan !== undefined) {
      lines.push(` switchport access vlan ${iface.accessVlan}`);
    }
  } else if (iface.mode === "routed") {
    if (hardwareModel.startsWith("Catalyst")) {
      lines.push(` no switchport`);
    }
    if (iface.ipAddress && iface.subnetMask) {
      lines.push(` ip address ${iface.ipAddress} ${iface.subnetMask}`);
    }
  }

  if (iface.servicePolicyOut) {
    lines.push(` service-policy output ${iface.servicePolicyOut}`);
  }

  if (iface.enabled) {
    lines.push(` no shutdown`);
  } else {
    lines.push(` shutdown`);
  }
  lines.push(`!`);
}
