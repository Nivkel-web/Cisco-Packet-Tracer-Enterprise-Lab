import { NetworkDevice, NetworkLink, AclRule } from '../types/network';

export interface CliSessionState {
  deviceId: string;
  mode: 'user' | 'privileged' | 'global_config' | 'interface_config' | 'subinterface_config' | 'router_ospf';
  currentInterface?: string;
  commandHistory: string[];
  historyIndex: number;
}

export interface CliOutput {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'table';
  stateChanges?: {
    device?: Partial<NetworkDevice>;
    toggleLink?: string;
    triggerOspfRecalc?: boolean;
    pingResult?: {
      targetIp: string;
      success: boolean;
      hops: string[];
    };
  };
}

export function getPrompt(device: NetworkDevice, session: CliSessionState): string {
  if (device.type === 'host' || device.type === 'server') {
    return `${device.hostname}:~$ `;
  }

  const base = device.hostname;
  switch (session.mode) {
    case 'user':
      return `${base}>`;
    case 'privileged':
      return `${base}#`;
    case 'global_config':
      return `${base}(config)#`;
    case 'interface_config':
      return `${base}(config-if)#`;
    case 'subinterface_config':
      return `${base}(config-subif)#`;
    case 'router_ospf':
      return `${base}(config-router)#`;
    default:
      return `${base}#`;
  }
}

export function executeCommand(
  rawInput: string,
  device: NetworkDevice,
  session: CliSessionState,
  allDevices: Record<string, NetworkDevice>,
  allLinks: NetworkLink[]
): { output: string; newSession: CliSessionState; updatedDevice: NetworkDevice; linkUpdates?: { linkId: string; status: 'up' | 'down' }[]; triggeredPing?: { srcId: string; dstIp: string; success: boolean } } {
  const input = rawInput.trim();
  const lower = input.toLowerCase();
  const parts = input.split(/\s+/);
  const cmd = parts[0]?.toLowerCase() || '';
  const newSession: CliSessionState = {
    ...session,
    commandHistory: input ? [...session.commandHistory, input] : session.commandHistory,
    historyIndex: -1,
  };
  let updatedDevice: NetworkDevice = JSON.parse(JSON.stringify(device));
  let linkUpdates: { linkId: string; status: 'up' | 'down' }[] | undefined;
  let triggeredPing: { srcId: string; dstIp: string; success: boolean } | undefined;

  if (!input) {
    return { output: '', newSession, updatedDevice };
  }

  // Common help
  if (cmd === '?' || cmd === 'help') {
    return {
      output: getHelpText(device, session.mode),
      newSession,
      updatedDevice,
    };
  }

  // Clear screen
  if (cmd === 'clear' || cmd === 'cls') {
    return {
      output: '__CLEAR__',
      newSession,
      updatedDevice,
    };
  }

  // Host Terminal logic (PC-HR1, WS-ENG1, SRV-DMZ, PC-BRANCH)
  if (device.type === 'host' || device.type === 'server') {
    if (cmd === 'ipconfig' || cmd === 'ifconfig') {
      const intf = Object.values(device.interfaces)[0];
      return {
        output: [
          `FastEthernet0 Connection:`,
          `   IPv4 Address. . . . . . . . . . . : ${intf?.ip || '0.0.0.0'}`,
          `   Subnet Mask . . . . . . . . . . . : ${intf?.subnetMask || '255.255.255.0'}`,
          `   Default Gateway . . . . . . . . . : ${device.defaultGateway || '0.0.0.0'}`,
          `   Physical Address (MAC). . . . . . : ${intf?.mac || 'Unknown'}`,
          `   VLAN Tag Association. . . . . . . : VLAN ${intf?.vlan || 1}`,
        ].join('\n'),
        newSession,
        updatedDevice,
      };
    }

    if (cmd === 'ping') {
      const targetIp = parts[1];
      if (!targetIp) {
        return { output: 'Usage: ping <ip_address>', newSession, updatedDevice };
      }

      // Check if target is reachable
      const result = checkIpReachability(device, targetIp, allDevices, allLinks);
      triggeredPing = {
        srcId: device.id,
        dstIp: targetIp,
        success: result.reachable,
      };

      if (result.reachable) {
        return {
          output: [
            `Pinging ${targetIp} with 32 bytes of data:`,
            `Reply from ${targetIp}: bytes=32 time=4ms TTL=127 [802.1Q tagged/routed]`,
            `Reply from ${targetIp}: bytes=32 time=3ms TTL=127`,
            `Reply from ${targetIp}: bytes=32 time=3ms TTL=127`,
            `Reply from ${targetIp}: bytes=32 time=4ms TTL=127`,
            ``,
            `Ping statistics for ${targetIp}:`,
            `    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),`,
            `Approximate round trip times in milli-seconds:`,
            `    Minimum = 3ms, Maximum = 4ms, Average = 3ms`,
          ].join('\n'),
          newSession,
          updatedDevice,
          triggeredPing,
        };
      } else {
        return {
          output: [
            `Pinging ${targetIp} with 32 bytes of data:`,
            `Request timed out.`,
            `Request timed out.`,
            `Request timed out.`,
            `Request timed out.`,
            ``,
            `Ping statistics for ${targetIp}:`,
            `    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss).`,
            `Reason: ${result.reason || 'Destination Host Unreachable'}`,
          ].join('\n'),
          newSession,
          updatedDevice,
          triggeredPing,
        };
      }
    }

    if (cmd === 'tracert' || cmd === 'traceroute') {
      const targetIp = parts[1];
      if (!targetIp) return { output: 'Usage: tracert <ip_address>', newSession, updatedDevice };
      const result = checkIpReachability(device, targetIp, allDevices, allLinks);
      return {
        output: [
          `Tracing route to ${targetIp} over a maximum of 30 hops:`,
          `  1     1 ms     1 ms     1 ms  ${device.defaultGateway} [Subif / GW]`,
          result.reachable ? `  2     3 ms     2 ms     2 ms  ${targetIp}` : `  2     *        *        *     Request timed out.`,
          `Trace complete.`,
        ].join('\n'),
        newSession,
        updatedDevice,
      };
    }

    if (cmd === 'curl' || cmd === 'wget') {
      const url = parts[1] || '';
      if (url.includes('192.168.30.10') || url.includes(':80')) {
        return {
          output: [
            `HTTP/1.1 200 OK`,
            `Server: Cisco-Enterprise-Web/2.4 (Unix)`,
            `Content-Type: text/html; charset=UTF-8`,
            ``,
            `<!DOCTYPE html>`,
            `<html><body><h1>Cisco Enterprise DMZ Portal</h1><p>Status: OPERATIONAL | Dot1Q VLAN 30 Protected</p></body></html>`,
          ].join('\n'),
          newSession,
          updatedDevice,
        };
      }
      return { output: `curl: (7) Failed to connect to ${url}: Connection refused`, newSession, updatedDevice };
    }

    return {
      output: `command not found: ${cmd}. Type 'help' for available commands (ipconfig, ping, tracert, curl).`,
      newSession,
      updatedDevice,
    };
  }

  // Cisco IOS Navigation Modes
  if (cmd === 'enable' || cmd === 'en') {
    newSession.mode = 'privileged';
    return { output: '', newSession, updatedDevice };
  }

  if (cmd === 'disable') {
    newSession.mode = 'user';
    return { output: '', newSession, updatedDevice };
  }

  if (cmd === 'configure' || cmd === 'conf' || lower === 'conf t' || lower === 'configure terminal') {
    newSession.mode = 'global_config';
    return { output: 'Enter configuration commands, one per line. End with CNTL/Z or "exit".', newSession, updatedDevice };
  }

  if (cmd === 'exit' || cmd === 'end') {
    if (session.mode === 'subinterface_config' || session.mode === 'interface_config' || session.mode === 'router_ospf') {
      newSession.mode = 'global_config';
      newSession.currentInterface = undefined;
    } else if (session.mode === 'global_config') {
      newSession.mode = 'privileged';
    } else if (session.mode === 'privileged') {
      newSession.mode = 'user';
    }
    return { output: '', newSession, updatedDevice };
  }

  // Cisco Show Commands (available in privileged or via 'do show' in config)
  const isDo = cmd === 'do';
  const effectiveParts = isDo ? parts.slice(1) : parts;
  const showCmd = effectiveParts[0]?.toLowerCase() || '';

  if (showCmd === 'show' || showCmd === 'sh') {
    const sub = effectiveParts[1]?.toLowerCase() || '';
    const sub2 = effectiveParts[2]?.toLowerCase() || '';

    // show ip route
    if (sub === 'ip' && (sub2 === 'route' || sub2 === 'ro')) {
      return {
        output: renderShowIpRoute(device),
        newSession,
        updatedDevice,
      };
    }

    // show ip ospf neighbor
    if (sub === 'ip' && sub2 === 'ospf' && effectiveParts[3]?.toLowerCase()?.startsWith('nei')) {
      return {
        output: renderShowIpOspfNeighbor(device),
        newSession,
        updatedDevice,
      };
    }

    // show ip ospf
    if (sub === 'ip' && sub2 === 'ospf') {
      return {
        output: renderShowIpOspf(device),
        newSession,
        updatedDevice,
      };
    }

    // show ip interface brief
    if (sub === 'ip' && (sub2 === 'interface' || sub2 === 'int') && (effectiveParts[3]?.toLowerCase()?.startsWith('br') || !effectiveParts[3])) {
      return {
        output: renderShowIpInterfaceBrief(device),
        newSession,
        updatedDevice,
      };
    }

    // show access-lists
    if (sub.startsWith('access') || (sub === 'ip' && sub2.startsWith('access'))) {
      return {
        output: renderShowAccessLists(device),
        newSession,
        updatedDevice,
      };
    }

    // show vlan brief (switches)
    if (sub === 'vlan' || (sub === 'vlan' && sub2.startsWith('br'))) {
      return {
        output: renderShowVlanBrief(device),
        newSession,
        updatedDevice,
      };
    }

    // show interfaces trunk
    if ((sub === 'interfaces' || sub === 'int') && sub2 === 'trunk') {
      return {
        output: renderShowInterfacesTrunk(device),
        newSession,
        updatedDevice,
      };
    }

    // show running-config
    if (sub.startsWith('run')) {
      return {
        output: renderShowRunningConfig(device),
        newSession,
        updatedDevice,
      };
    }
  }

  // Ping command on Cisco router
  if (cmd === 'ping') {
    const targetIp = parts[1];
    if (!targetIp) return { output: '% Incomplete command. Usage: ping <ip_address>', newSession, updatedDevice };

    const result = checkIpReachability(device, targetIp, allDevices, allLinks);
    triggeredPing = {
      srcId: device.id,
      dstIp: targetIp,
      success: result.reachable,
    };

    if (result.reachable) {
      return {
        output: [
          `Type escape sequence to abort.`,
          `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`,
          `!!!!!`,
          `Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
        ].join('\n'),
        newSession,
        updatedDevice,
        triggeredPing,
      };
    } else {
      return {
        output: [
          `Type escape sequence to abort.`,
          `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`,
          `.....`,
          `Success rate is 0 percent (0/5)`,
          `% Destination unreachable or filtered by ACL 101.`,
        ].join('\n'),
        newSession,
        updatedDevice,
        triggeredPing,
      };
    }
  }

  // Traceroute on Cisco router
  if (cmd === 'traceroute' || cmd === 'trace') {
    const targetIp = parts[1];
    if (!targetIp) return { output: '% Incomplete command. Usage: traceroute <ip_address>', newSession, updatedDevice };
    const result = checkIpReachability(device, targetIp, allDevices, allLinks);
    return {
      output: [
        `Type escape sequence to abort.`,
        `Tracing the route to ${targetIp}`,
        `  1 10.0.0.2 2 msec 1 msec 2 msec [OSPF Cost 64 Primary Serial]`,
        result.reachable ? `  2 ${targetIp} 4 msec 3 msec 3 msec` : `  2 * * *`,
      ].join('\n'),
      newSession,
      updatedDevice,
    };
  }

  // Config mode commands
  if (session.mode === 'global_config') {
    // interface command
    if (cmd === 'interface' || cmd === 'int') {
      const intfName = parts[1];
      if (!intfName) return { output: '% Incomplete command. e.g. "interface GigabitEthernet0/0.10" or "int s0/0/0"', newSession, updatedDevice };

      const resolved = resolveInterfaceName(intfName, device);
      if (resolved.includes('.')) {
        newSession.mode = 'subinterface_config';
        newSession.currentInterface = resolved;
        return { output: '', newSession, updatedDevice };
      } else {
        newSession.mode = 'interface_config';
        newSession.currentInterface = resolved;
        return { output: '', newSession, updatedDevice };
      }
    }

    // router ospf <id>
    if (cmd === 'router' && parts[1]?.toLowerCase() === 'ospf') {
      newSession.mode = 'router_ospf';
      return { output: '', newSession, updatedDevice };
    }

    // hostname <name>
    if (cmd === 'hostname') {
      const name = parts[1];
      if (name) {
        updatedDevice.hostname = name;
        return { output: '', newSession, updatedDevice };
      }
    }
  }

  // Interface / Subinterface config commands
  if (session.mode === 'interface_config' || session.mode === 'subinterface_config') {
    const intfName = session.currentInterface || '';

    // shutdown
    if (cmd === 'shutdown' || cmd === 'shut') {
      if (intfName in updatedDevice.interfaces) {
        updatedDevice.interfaces[intfName].status = 'administratively_down';
        // find matching link to toggle
        const matchedLink = allLinks.find(
          (l) => (l.sourceDevId === device.id && l.sourceIntf === intfName) || (l.targetDevId === device.id && l.targetIntf === intfName)
        );
        if (matchedLink) {
          linkUpdates = [{ linkId: matchedLink.id, status: 'down' }];
        }
        // if this was Serial0/0/0, reroute OSPF to Serial0/0/1
        recalculateOspfAfterInterfaceChange(updatedDevice, allDevices);
        return {
          output: `%LINK-5-CHANGED: Interface ${intfName}, changed state to administratively down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${intfName}, changed state to down`,
          newSession,
          updatedDevice,
          linkUpdates,
        };
      }
      if (updatedDevice.subInterfaces && intfName in updatedDevice.subInterfaces) {
        updatedDevice.subInterfaces[intfName].status = 'down';
        return { output: `%LINK-5-CHANGED: Subinterface ${intfName}, changed state to down`, newSession, updatedDevice };
      }
    }

    // no shutdown
    if (lower === 'no shutdown' || lower === 'no shut') {
      if (intfName in updatedDevice.interfaces) {
        updatedDevice.interfaces[intfName].status = 'up';
        const matchedLink = allLinks.find(
          (l) => (l.sourceDevId === device.id && l.sourceIntf === intfName) || (l.targetDevId === device.id && l.targetIntf === intfName)
        );
        if (matchedLink) {
          linkUpdates = [{ linkId: matchedLink.id, status: 'up' }];
        }
        recalculateOspfAfterInterfaceChange(updatedDevice, allDevices);
        return {
          output: `%LINK-5-CHANGED: Interface ${intfName}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${intfName}, changed state to up`,
          newSession,
          updatedDevice,
          linkUpdates,
        };
      }
      if (updatedDevice.subInterfaces && intfName in updatedDevice.subInterfaces) {
        updatedDevice.subInterfaces[intfName].status = 'up';
        return { output: `%LINK-5-CHANGED: Subinterface ${intfName}, changed state to up`, newSession, updatedDevice };
      }
    }

    // encapsulation dot1Q <vlan>
    if (session.mode === 'subinterface_config' && (lower.startsWith('encapsulation dot1q') || lower.startsWith('encap dot1q'))) {
      const vlanNum = parseInt(parts[2], 10);
      if (!isNaN(vlanNum)) {
        if (!updatedDevice.subInterfaces) updatedDevice.subInterfaces = {};
        if (updatedDevice.subInterfaces[intfName]) {
          updatedDevice.subInterfaces[intfName].vlan = vlanNum;
          updatedDevice.subInterfaces[intfName].encapsulation = 'dot1Q';
          return { output: `% 802.1Q encapsulation bound to VLAN ${vlanNum}`, newSession, updatedDevice };
        }
      }
    }

    // ip address <ip> <mask>
    if (lower.startsWith('ip address') || lower.startsWith('ip add')) {
      const ip = parts[2];
      const mask = parts[3];
      if (ip && mask) {
        if (session.mode === 'subinterface_config' && updatedDevice.subInterfaces?.[intfName]) {
          updatedDevice.subInterfaces[intfName].ip = ip;
          updatedDevice.subInterfaces[intfName].subnetMask = mask;
          return { output: '', newSession, updatedDevice };
        }
        if (updatedDevice.interfaces[intfName]) {
          updatedDevice.interfaces[intfName].ip = ip;
          updatedDevice.interfaces[intfName].subnetMask = mask;
          return { output: '', newSession, updatedDevice };
        }
      }
    }

    // bandwidth <kbps>
    if (lower.startsWith('bandwidth')) {
      const bw = parseInt(parts[1], 10);
      if (!isNaN(bw) && updatedDevice.interfaces[intfName]) {
        updatedDevice.interfaces[intfName].bandwidthKbps = bw;
        // recalculate OSPF cost: 100,000 / bw
        const newCost = Math.max(1, Math.round(100000 / bw));
        updatedDevice.interfaces[intfName].ospfCost = newCost;
        return { output: `% Bandwidth set to ${bw} Kbit, recalculated OSPF cost: ${newCost}`, newSession, updatedDevice };
      }
    }
  }

  // Router OSPF config mode
  if (session.mode === 'router_ospf') {
    if (lower.startsWith('network')) {
      // network 192.168.10.0 0.0.0.255 area 0
      return { output: `% OSPF network statement registered: ${input.substring(7)}`, newSession, updatedDevice };
    }
    if (lower.startsWith('router-id')) {
      updatedDevice.ospfRouterId = parts[1];
      return { output: `% OSPF router-id configured as ${parts[1]}`, newSession, updatedDevice };
    }
  }

  return {
    output: `% Invalid input detected at '^' marker: "${input}"\nType '?' or 'help' for available commands.`,
    newSession,
    updatedDevice,
  };
}

function resolveInterfaceName(input: string, device: NetworkDevice): string {
  const norm = input.toLowerCase();
  if (norm.startsWith('g0/0.') || norm.startsWith('gigabitethernet0/0.')) {
    const sub = norm.split('.')[1];
    return `G0/0.${sub}`;
  }
  if (norm.startsWith('s0/0/0') || norm.startsWith('serial0/0/0')) return 'Serial0/0/0';
  if (norm.startsWith('s0/0/1') || norm.startsWith('serial0/0/1')) return 'Serial0/0/1';
  if (norm.startsWith('g0/0') || norm.startsWith('gigabitethernet0/0')) return 'GigabitEthernet0/0';
  if (norm.startsWith('fa0/') || norm.startsWith('fastethernet0/')) {
    const num = norm.replace(/^(fa0\/|fastethernet0\/)/, '');
    return `FastEthernet0/${num}`;
  }
  return input;
}

function recalculateOspfAfterInterfaceChange(device: NetworkDevice, allDevices: Record<string, NetworkDevice>) {
  if (!device.routingTable) return;

  const s0 = device.interfaces['Serial0/0/0'];
  const s1 = device.interfaces['Serial0/0/1'];

  const s0IsUp = s0 && s0.status === 'up';
  const s1IsUp = s1 && s1.status === 'up';

  // update OSPF route to 192.168.40.0
  device.routingTable = device.routingTable.map((route) => {
    if (route.type === 'O' && route.network === '192.168.40.0') {
      if (s0IsUp) {
        return {
          ...route,
          metric: 65,
          nextHop: '10.0.0.2',
          outgoingInterface: 'Serial0/0/0',
        };
      } else if (s1IsUp) {
        return {
          ...route,
          metric: 196,
          nextHop: '10.0.1.2',
          outgoingInterface: 'Serial0/0/1',
        };
      }
    }
    return route;
  });

  // update neighbors
  if (device.ospfNeighbors) {
    if (s0IsUp) {
      device.ospfNeighbors[0] = {
        neighborId: '2.2.2.2',
        priority: 0,
        state: 'FULL',
        deadTime: 37,
        address: '10.0.0.2',
        interface: 'Serial0/0/0',
      };
    } else if (s1IsUp) {
      device.ospfNeighbors[0] = {
        neighborId: '2.2.2.2',
        priority: 0,
        state: 'FULL',
        deadTime: 39,
        address: '10.0.1.2',
        interface: 'Serial0/0/1',
      };
    } else {
      device.ospfNeighbors[0].state = 'DOWN';
    }
  }

  // Update Branch-R2 routing table in symmetry
  const branch = allDevices['Branch-R2'];
  if (branch && branch.routingTable) {
    branch.routingTable = branch.routingTable.map((route) => {
      if (route.type === 'O') {
        if (s0IsUp) {
          return { ...route, metric: 65, nextHop: '10.0.0.1', outgoingInterface: 'Serial0/0/0' };
        } else if (s1IsUp) {
          return { ...route, metric: 196, nextHop: '10.0.1.1', outgoingInterface: 'Serial0/0/1' };
        }
      }
      return route;
    });
  }
}

function checkIpReachability(
  srcDev: NetworkDevice,
  targetIp: string,
  allDevices: Record<string, NetworkDevice>,
  allLinks: NetworkLink[]
): { reachable: boolean; reason?: string } {
  // If target is in 192.168.30.0 (DMZ) and ACL 101 blocks
  // Check primary WAN serial link status if going to Branch (192.168.40.0)
  if (targetIp.startsWith('192.168.40.')) {
    const r1 = allDevices['HQ-R1'];
    const s0Up = r1?.interfaces['Serial0/0/0']?.status === 'up';
    const s1Up = r1?.interfaces['Serial0/0/1']?.status === 'up';
    if (!s0Up && !s1Up) {
      return { reachable: false, reason: 'Both Primary & Redundant WAN Serial Links DOWN' };
    }
    return { reachable: true };
  }

  // Check DMZ ACL
  if (targetIp === '192.168.30.10') {
    // If ICMP ping, ACL 101 rule 50 allows ICMP
    return { reachable: true };
  }

  if (targetIp.startsWith('192.168.10.') || targetIp.startsWith('192.168.20.')) {
    return { reachable: true };
  }

  return { reachable: true };
}

function renderShowIpRoute(device: NetworkDevice): string {
  if (!device.routingTable) return '% IP routing not enabled on this device';

  const lines = [
    `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP`,
    `       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area`,
    `       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2`,
    `       E1 - OSPF external type 1, E2 - OSPF external type 2`,
    `Gateway of last resort is not set`,
    ``,
  ];

  device.routingTable.forEach((r) => {
    if (r.type === 'C') {
      lines.push(`C    ${r.network}/24 is directly connected, ${r.outgoingInterface}`);
    } else if (r.type === 'O') {
      lines.push(`O    ${r.network}/24 [${r.administrativeDistance}/${r.metric}] via ${r.nextHop}, 00:14:22, ${r.outgoingInterface}`);
    } else if (r.type === 'S') {
      lines.push(`S    ${r.network}/24 [${r.administrativeDistance}/${r.metric}] via ${r.nextHop}`);
    }
  });

  return lines.join('\n');
}

function renderShowIpOspfNeighbor(device: NetworkDevice): string {
  if (!device.ospfNeighbors || device.ospfNeighbors.length === 0) {
    return '% OSPF not configured or no active neighbors';
  }

  const lines = [
    `Neighbor ID     Pri   State           Dead Time   Address         Interface`,
    `---------------------------------------------------------------------------------`,
  ];

  device.ospfNeighbors.forEach((n) => {
    lines.push(
      `${n.neighborId.padEnd(16)}${String(n.priority).padEnd(6)}${n.state.padEnd(16)}00:00:${String(n.deadTime).padStart(2, '0')}    ${n.address.padEnd(16)}${n.interface}`
    );
  });

  return lines.join('\n');
}

function renderShowIpOspf(device: NetworkDevice): string {
  return [
    `Routing Process "ospf ${device.ospfProcessId || 1}" with ID ${device.ospfRouterId || '1.1.1.1'}`,
    `  Start time: 00:00:28.140, CPU time used: 0.040 secs`,
    `  Supports only single TOS(TOS0) routes`,
    `  Supports opaque LSA`,
    `  It is an autonomous system boundary router (ASBR)`,
    `  Area 0:`,
    `    Number of interfaces in this area is 3`,
    `    Number of fully adjacent neighbors in this area: ${device.ospfNeighbors?.filter(n => n.state === 'FULL').length || 0}`,
    `    SPF algorithm executed 6 times`,
    `    Dijkstra calculations: Shortest Path Tree (SPT) converged`,
  ].join('\n');
}

function renderShowIpInterfaceBrief(device: NetworkDevice): string {
  const lines = [
    `Interface              IP-Address      OK? Method Status                Protocol`,
    `--------------------------------------------------------------------------------`,
  ];

  Object.values(device.interfaces).forEach((intf) => {
    const ip = intf.ip || 'unassigned';
    const statusStr = intf.status === 'up' ? 'up' : 'administratively down';
    const protoStr = intf.status === 'up' ? 'up' : 'down';
    lines.push(`${intf.name.padEnd(23)}${ip.padEnd(16)}YES manual ${statusStr.padEnd(22)}${protoStr}`);
  });

  if (device.subInterfaces) {
    Object.values(device.subInterfaces).forEach((sub) => {
      const statusStr = sub.status === 'up' ? 'up' : 'down';
      lines.push(`${sub.name.padEnd(23)}${sub.ip.padEnd(16)}YES manual ${statusStr.padEnd(22)}${statusStr}`);
    });
  }

  return lines.join('\n');
}

function renderShowAccessLists(device: NetworkDevice): string {
  if (!device.acls || Object.keys(device.acls).length === 0) {
    return '% No access-lists configured';
  }

  const lines: string[] = [];
  Object.entries(device.acls).forEach(([aclName, rules]) => {
    lines.push(`Extended IP access list ${aclName}`);
    rules.forEach((r) => {
      let desc = `    ${r.seq} ${r.action} ${r.protocol} ${r.source}`;
      if (r.sourceWildcard) desc += ` ${r.sourceWildcard}`;
      desc += ` ${r.destination}`;
      if (r.destWildcard) desc += ` ${r.destWildcard}`;
      if (r.port) desc += ` eq ${r.port}`;
      desc += ` (${r.hitCount} matches)`;
      lines.push(desc);
    });
  });

  return lines.join('\n');
}

function renderShowVlanBrief(device: NetworkDevice): string {
  if (!device.vlanDatabase) return '% This command is supported on Layer 2 / Layer 3 switches';

  const lines = [
    `VLAN Name                             Status    Ports`,
    `---- -------------------------------- --------- -------------------------------`,
  ];

  Object.entries(device.vlanDatabase).forEach(([vlanId, vlanName]) => {
    const ports = Object.values(device.interfaces)
      .filter((i) => i.vlan === Number(vlanId))
      .map((i) => i.name)
      .join(', ');
    lines.push(`${vlanId.padEnd(5)}${vlanName.padEnd(33)}active    ${ports || 'Fa0/1 (Trunk)'}`);
  });

  return lines.join('\n');
}

function renderShowInterfacesTrunk(device: NetworkDevice): string {
  return [
    `Port        Mode         Encapsulation  Status        Native vlan`,
    `Fa0/1       on           802.1q         trunking      1`,
    ``,
    `Port        Vlans allowed on trunk`,
    `Fa0/1       1-4094`,
    ``,
    `Port        Vlans allowed and active in management domain`,
    `Fa0/1       1,10,20,30`,
    ``,
    `Port        Vlans in spanning tree forwarding state and not pruned`,
    `Fa0/1       1,10,20,30`,
  ].join('\n');
}

function renderShowRunningConfig(device: NetworkDevice): string {
  const lines = [
    `Building configuration...`,
    `Current configuration : 1842 bytes`,
    `!`,
    `version 15.4`,
    `hostname ${device.hostname}`,
    `!`,
  ];

  if (device.subInterfaces) {
    lines.push(`interface GigabitEthernet0/0`);
    lines.push(` no ip address`);
    lines.push(` duplex auto`);
    lines.push(` speed auto`);
    lines.push(`!`);
    Object.values(device.subInterfaces).forEach((s) => {
      lines.push(`interface ${s.name}`);
      lines.push(` encapsulation dot1Q ${s.vlan}`);
      lines.push(` ip address ${s.ip} ${s.subnetMask}`);
      if (s.aclOutbound) lines.push(` ip access-group ${s.aclOutbound} out`);
      lines.push(`!`);
    });
  }

  if (device.interfaces['Serial0/0/0']) {
    const s0 = device.interfaces['Serial0/0/0'];
    lines.push(`interface Serial0/0/0`);
    lines.push(` ip address ${s0.ip} ${s0.subnetMask}`);
    lines.push(` bandwidth ${s0.bandwidthKbps}`);
    lines.push(` clock rate 64000`);
    lines.push(`!`);
  }

  if (device.interfaces['Serial0/0/1']) {
    const s1 = device.interfaces['Serial0/0/1'];
    lines.push(`interface Serial0/0/1`);
    lines.push(` ip address ${s1.ip} ${s1.subnetMask}`);
    lines.push(` bandwidth ${s1.bandwidthKbps}`);
    lines.push(` clock rate 64000`);
    lines.push(`!`);
  }

  if (device.ospfProcessId) {
    lines.push(`router ospf ${device.ospfProcessId}`);
    lines.push(` router-id ${device.ospfRouterId}`);
    lines.push(` network 192.168.10.0 0.0.0.255 area 0`);
    lines.push(` network 192.168.20.0 0.0.0.255 area 0`);
    lines.push(` network 192.168.30.0 0.0.0.255 area 0`);
    lines.push(` network 10.0.0.0 0.0.0.3 area 0`);
    lines.push(` network 10.0.1.0 0.0.0.3 area 0`);
    lines.push(`!`);
  }

  if (device.acls) {
    Object.entries(device.acls).forEach(([num, rules]) => {
      rules.forEach((r) => {
        let l = `access-list ${num} ${r.action} ${r.protocol} ${r.source}`;
        if (r.sourceWildcard) l += ` ${r.sourceWildcard}`;
        l += ` ${r.destination}`;
        if (r.destWildcard) l += ` ${r.destWildcard}`;
        if (r.port) l += ` eq ${r.port}`;
        lines.push(l);
      });
    });
    lines.push(`!`);
  }

  lines.push(`end`);
  return lines.join('\n');
}

function getHelpText(device: NetworkDevice, mode: string): string {
  if (device.type === 'host' || device.type === 'server') {
    return [
      `Host Terminal Commands:`,
      `  ipconfig / ifconfig   Display network adapter IP, mask, default gateway, and VLAN ID`,
      `  ping <ip>             Send ICMP Echo requests to destination host`,
      `  tracert <ip>          Trace route hop-by-hop across routers`,
      `  curl <url>            HTTP GET request (test port 80 against SRV-DMZ 192.168.30.10)`,
      `  clear                 Clear console screen`,
    ].join('\n');
  }

  return [
    `Cisco IOS Exec Commands (Mode: ${mode}):`,
    `  enable (en)                 Enter privileged EXEC mode`,
    `  configure terminal (conf t) Enter global configuration mode`,
    `  show ip route               Display IP routing table (C, S, OSPF O routes)`,
    `  show ip ospf neighbor       Display OSPF neighbor states (FULL/DROTHER) and dead times`,
    `  show ip ospf                Display OSPF router process ID, router-id, and SPF convergence stats`,
    `  show ip interface brief     Display interface status, IP address, and protocol state`,
    `  show access-lists           Display ACL 101 rules and real-time hit counts`,
    `  show running-config         Display active Cisco IOS configuration`,
    `  show vlan brief             (Switch) Display configured VLANs and port assignments`,
    `  show interfaces trunk       (Switch) Display 802.1Q trunking status`,
    `  ping <ip>                   Send 5 ICMP echo packets to test connectivity`,
    `  traceroute <ip>             Hop-by-hop path tracing`,
    `  interface <name>            Enter interface or subinterface configuration (e.g. g0/0.10, s0/0/0)`,
    `  shutdown / no shutdown      Toggle interface state (simulate cable cut / failover)`,
    `  encapsulation dot1Q <vlan>  Bind 802.1Q trunk VLAN tag to subinterface`,
    `  bandwidth <kbps>            Set interface bandwidth to recalculate OSPF metric`,
    `  clear                       Clear console screen`,
  ].join('\n');
}
