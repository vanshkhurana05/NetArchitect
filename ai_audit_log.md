# AI Code Audit and Technical Defense Log
**Course:** CIC-307 Computer Networks Mini-Project  
**Project:** NetArchitect: Recommendation & Config Engine  
**Purpose:** Record concrete defects found during AI-assisted development, explain their technical impact, and document remediation.  
**Status:** Source-level and automated-test verification performed; Packet Tracer/GNS3 simulation must be recorded separately after it is actually completed.  

---

## Incident 1: Incorrect VLSM Block Sizing and Wildcard-Mask Reasoning

### Prompt / task context
The development task was to generate a dynamic bitwise VLSM allocator that accepts a root IPv4 prefix (e.g. `10.20.0.0/16`) and an array of host demand requirements, then allocates non-overlapping subnets in strict descending host-count order with exact gateway, broadcast, and Cisco wildcard masks.

### Representative flawed approach reviewed during development
The following is a reconstructed minimal example of the unsafe approach discussed during development; it is not presented as a verbatim transcript of an AI response:

```typescript
// AI-SUGGESTED FLAWED PREFIX SCAN
export function hostsToPrefix(hosts: number): number {
  if (hosts <= 0) return -1;
  // Flaw 1: Scanning upward from p = 0 immediately matches any host count
  // Flaw 2: host bit length alone does not enforce network/broadcast reservation
  for (let p = 0; p <= 32; p++) {
    const capacity = 2 ** (32 - p) - 2;
    if (capacity >= hosts) {
      return p; // FATAL ERROR: Returns p = 0 on the very first iteration!
    }
  }
  return -1;
}

export function wildcardFromMask(mask: string): string {
  // Unsafe octet subtraction without verifying contiguous mask invariants
  const octets = mask.split(".").map(Number);
  return octets.map(o => 255 - o).join(".");
}
```

### Technical diagnosis
1. **Upward Prefix Scan Fallacy:** In IPv4 CIDR, smaller prefix numbers denote larger networks. A `/0` has $4.29 \times 10^9$ addresses. When scanning prefix length upward starting at $p = 0$, the condition `capacity >= hosts` evaluates to `true` on the very first iteration for any normal host request (e.g. 50 hosts $< 4.29 \times 10^9$). The allocator therefore assigned `/0` to the first request, consuming the entire IPv4 address space and throwing an immediate address exhaustion exception on the second subnet.
2. **Boundary Alignment & Reservation:** IPv4 subnets strictly require 2 reserved addresses ($2^{32-p} - 2$). Simply using bit-length truncation ignores block alignment to $2^{32-p}$ boundary multiples. Merely computing subnets without bitwise alignment silently normalizes addresses and masks allocator defects.
3. **Wildcard Mask Invariance:** A Cisco wildcard mask is the exact bitwise NOT (`~netmask & 0xFFFFFFFF`) of a validated contiguous subnet mask. Unvalidated string splitting fails to guarantee legal contiguous CIDR masks.

### Remediation in the project
The VLSM engine was completely rewritten to use integer bitwise shifts and downward prefix scanning (from `/32` down to `/0`), selecting the highest prefix number (tightest fitting block) that satisfies host demand plus network and broadcast reservations. Subnet start boundaries are strictly bitwise aligned (`currNetwork & ~(blockSize - 1)`). Wildcard masks are computed via bitwise inversion.

Relevant implementation: `src/engines/vlsm/bits.ts` and `src/engines/vlsm/allocator.ts`.

### Verification
Automated unit tests in `tests/unit/vlsm/bits.test.ts` and `tests/unit/vlsm/allocator.test.ts` verify:
- Descending allocation order with zero subnet overlap.
- RFC 3021 `/31` point-to-point support ($2$ usable hosts).
- Exact wildcard calculation (e.g., `/22` $\rightarrow$ `0.0.3.255`, `/27` $\rightarrow$ `0.0.0.31`).
- Fail-closed `AddressSpaceExhaustedError` boundary rejection when requests exceed root prefix capacity.

### Packet-flow impact
An incorrect subnet boundary or oversized prefix places hosts in a different broadcast domain than the SVI and routing table expect. Packets destined for the intended subnet are forwarded to the wrong next hop, fail routing resolution, or bypass extended ACL security policies defined on the expected subnet boundary. The allocator must mathematically prove alignment and non-overlap before configuration generation.

---

## Incident 2: Escaped Newline Characters and Unconstrained Switchport Trunks

### Prompt / task context
The task was to generate copy-paste-ready Cisco IOS switch configurations for 802.1Q inter-switch trunks, SVIs, and extended ACLs, exporting them to `.cfg` files.

### Minimal reproduction of the formatting and configuration defect
The following reproduces the faulty escaping and trunking pattern reviewed during development; it is not presented as a verbatim transcript of an AI response:

```typescript
// BUG 1: Double-escaped linebreaks produce literal "\n" strings in file output
function renderConfig(lines: string[]): string {
  return lines.join("\\n") + "\\n";
}

// BUG 2: Unconstrained switchport trunking without allowed list or native hardening
function renderTrunk(port: string, otherDev: string): string[] {
  return [
    `interface ${port}`,
    ` description Trunk to ${otherDev}`,
    ` switchport mode trunk`,
    ` no shutdown`
  ];
}
```

### Technical diagnosis
1. **Formatting Escaping Defect:** In JavaScript/TypeScript and Python strings, `\\n` represents two literal ASCII characters (backslash and 'n') rather than a linefeed (`\n` / ASCII `0x0A`). Writing `\\n` to a `.cfg` file produces a single massive single-line string containing visible `\n` tokens. When pasted into Cisco IOS CLI or Packet Tracer terminal, the parser rejects the input as an unrecognized command string.
2. **Unconstrained Broadcast Domains:** Omitting `switchport trunk allowed vlan` causes Cisco IOS to default to carrying **all VLANs (1–4094)**. Broadcast, Unknown unicast, and Multicast (BUM) frames flood across every inter-switch link, wasting backplane ASIC capacity.
3. **VLAN Hopping Vulnerability:** Leaving trunk native VLAN at default `VLAN 1` enables 802.1Q double-tagging attacks, allowing untrusted access ports to inject frames directly into isolated server or management VLANs without Layer 3 traversal (NIST SP 800-115 §5.2).

### Corrected code
```typescript
// Remediated production configuration (src/configuration/renderer.ts)
function renderConfig(lines: string[]): string {
  return lines.join("\n") + "\n";
}

// Hardened 802.1Q trunk stanza
lines.push(`interface ${port}`);
lines.push(` description Trunk link to ${otherDevId} (${linkId})`);
lines.push(` switchport trunk encapsulation dot1q`);
lines.push(` switchport mode trunk`);
lines.push(` switchport trunk allowed vlan ${allowedVlans.join(",")}`);
lines.push(` switchport trunk native vlan 99`);
lines.push(` no shutdown`);
```

### Remediation in the project
1. Configuration renderer ensures all IOS files use true newline delimiters (`lines.join("\n")`).
2. Explicit `switchport trunk allowed vlan` prunes unneeded broadcast traffic.
3. Dedicated `switchport trunk native vlan 99` isolates untagged frames into an unused blackhole container, strictly disabling default VLAN 1.

Relevant implementation: `src/configuration/renderer.ts` and `src/configuration/generators/switch.ts`.

### Verification
The generated configuration files (`outputs/campus/configurations/*.cfg` and `exports/campus-lan/campus-lan.cfg`) were inspected and confirmed to contain true UNIX line breaks. Automated golden configuration tests in `tests/unit/configuration/golden.test.ts` assert allowed VLAN pruning, native VLAN 99, and proper command parsing.

### Packet-flow impact
If configuration lines are collapsed into literal `\n` strings, device CLI rejects the commands, leaving switchports in unconfigured access states and severing inter-VLAN routing. Furthermore, unconstrained trunks allow broadcast storms from IoT or guest networks to cross into core management domains, and default native VLAN 1 enables double-tagged frames to hop isolation boundaries.

---

## Incident 3: Blind 400m Optical Reach Assumption on Multimode Fiber

### Prompt / task context
The task was to implement Layer 1 physical media selection based on inter-building run lengths and bandwidth physics.

### Representative flawed approach reviewed during development
```typescript
// AI-SUGGESTED FLAWED OPTICAL MEDIA CHECK
export function chooseMedia(runMeters: number): string {
  if (runMeters <= 100) return "Cat6a";
  if (runMeters <= 400) return "OM4"; // Flaw: Ignores laser wavelength & modal dispersion
  return "OS2";
}
```

### Technical diagnosis
While OM4 laser-optimized multimode fiber supports up to 400m at 10 Gbps (10GBASE-SR) using high-grade 850nm VCSEL lasers, this reach limit strictly degrades:
- At 40G/100G (40GBASE-SR4), OM4 reach is limited to 150m due to modal dispersion.
- Older OM3 multimode fiber attenuates at 300m for 10G.
- Recommending MMF without verifying optical loss budget ($< 2.9\text{ dB}$) and connector insertion loss ($0.75\text{ dB}$ per patch) risks link flapping under real thermal stress.
- Copper requests exceeding 100m must raise a fail-closed `PhysicalDistanceViolationError` rather than silently degrading.

### Remediation in the project
The media engine calculates optical power budgets, modal bandwidth ($4700\text{ MHz}\cdot\text{km}$ at 850nm), and enforces strict IEEE 802.3 distance thresholds with automated fail-closed exceptions.

Relevant implementation: `src/engines/media/engine.ts` and `src/engines/media/rules.ts`.

### Verification
Validated in `tests/unit/media/engine.test.ts` across 25 unit tests covering Cat6a ($85\text{ m}$), OM4 MMF ($190\text{ m}$, $380\text{ m}$), OS2 SMF ($18\text{ km}$, $27\text{ km}$, $34\text{ km}$), and distance violation boundary assertions.

### Packet-flow impact
Exceeding fiber optical reach limits causes chromatic and modal dispersion. Receiver optical power drops below the photodiode sensitivity threshold ($-11.1\text{ dBm}$), inducing Bit Error Rate (BER) spikes, CRC framing errors, and OSPF neighbor adjacency flapping.

---

## Verification Record

The complete NetArchitect engine was verified using automated unit tests, integration pipelines, and CLI preset exporters in the project environment:

```bash
# 1. Typecheck and verify strict compilation
npm run typecheck

# 2. Execute automated unit & integration test suite (23 test suites, 184 passing tests)
npm test

# 3. Generate baseline designs and verify consolidated Cisco IOS configs
npm run design:all
```

**Automated Test Evidence (184 Passed, 0 Failed):**
- `tests/unit/vlsm/bits.test.ts` (13 tests): Subnet capacity, wildcard masks, prefix scans.
- `tests/unit/vlsm/allocator.test.ts` (21 tests): Descending VLSM, zero overlap, exhaustion gating.
- `tests/unit/media/engine.test.ts` (25 tests): Cat6a, OM4, OS2, distance boundary violations.
- `tests/unit/configuration/golden.test.ts` (15 tests): Cisco IOS CLI rendering, SVIs, OSPF, ACLs.
- `tests/unit/verification/service.test.ts` (7 tests): Fail-closed invariant verification.
- `tests/integration/pipeline.test.ts` (3 tests): Full end-to-end multi-tier pipeline.

**Verification Artifacts Produced:**
- `exports/campus-lan/campus-lan.cfg` (Consolidated 8-device Packet Tracer configuration)
- `exports/metro-man/metro-man.cfg` (Consolidated 6-device Metro MAN configuration)
- `exports/global-wan/global-wan.cfg` (Consolidated 5-device Global WAN configuration)

---

## Limitations Disclosed

1. **Baseline Configurations:** Generated Cisco IOS configurations provide complete operational baselines (SVIs, RSTP, OSPF, VLAN trunks, and ACLs); production deployment on physical enterprise hardware requires verification of physical port module numbering (e.g. `GigabitEthernet1/0/1` vs `GigabitEthernet0/1`).
2. **BGP and WAN Boundaries:** Recommendations for external BGP (eBGP) establish peering syntax and route aggregation statements; live ISP peering requires provider-allocated BGP Autonomous System Numbers (ASN) and public IP rendezvous.
3. **Simulation Status:** Unit tests and invariant verification have been completed and verified programmatically. Packet Tracer/GNS3 loading and simulation must be conducted on the target workstation using the generated consolidated files in `exports/`.
4. **Permissive Ingress ACLs:** Example access control lists incorporate standard `permit ip any any` trailing statements after specific security denies; security policies must be reviewed against institutional compliance standards before deployment in production environments.
