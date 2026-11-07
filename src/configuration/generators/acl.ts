/**
 * ACL Configuration Generator.
 * Populates standard, extended, and crypto ACL intermediate models.
 * OWNER: Configuration Generator Agent (src/configuration/).
 */
import type { Device } from "../../contracts/topology.js";
import type { RoutingPlan } from "../../contracts/routing.js";
import type { AclConfigModel } from "../model.js";

/**
 * Builds Access Control Lists for a device.
 */
export function generateDeviceAcls(
  device: Device,
  routing: RoutingPlan,
): AclConfigModel[] {
  const acls: AclConfigModel[] = [];

  // 1. Management VTY Hardening ACL
  acls.push({
    name: "MGMT-VTY-ACCESS",
    type: "standard",
    rules: [
      {
        action: "permit",
        protocol: "ip",
        source: "10.0.0.0",
        sourceWildcard: "0.255.255.255",
        destination: "any",
        remark: "Allow internal management subnets to VTY lines",
      },
      {
        action: "deny",
        protocol: "ip",
        source: "any",
        destination: "any",
        remark: "Deny all other remote management attempts",
      },
    ],
  });

  // 2. IPsec Crypto ACL for border routers
  const deviceTunnels = routing.vpnTunnels.filter((t) => t.deviceId === device.id);
  if (deviceTunnels.length > 0) {
    const rules = deviceTunnels.map((t) => {
      const localBase = t.localProtectedCidr.split("/")[0]!;
      const remoteBase = t.remoteProtectedCidr.split("/")[0]!;
      return {
        action: "permit" as const,
        protocol: "ip" as const,
        source: localBase,
        sourceWildcard: "0.0.15.255", // /20 wildcard
        destination: remoteBase,
        destinationWildcard: "0.0.255.255", // /16 wildcard
        remark: `Interesting traffic for IPsec tunnel to Cloud (${t.peerPublicIp})`,
      };
    });

    acls.push({
      name: "IPSEC-CRYPTO-ACL",
      type: "extended",
      rules,
    });
  }

  return acls;
}
