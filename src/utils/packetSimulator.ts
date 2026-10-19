import {
  NetworkDevice,
  NetworkLink,
  SimulatedPacket,
  PduDetails,
  AclRule,
  PacketCaptureEvent,
} from '../types/network';

export function createPacket(
  srcId: string,
  dstId: string,
  protocol: 'ICMP' | 'HTTP' | 'SSH' | 'SQL',
  allDevices: Record<string, NetworkDevice>,
  allLinks: NetworkLink[]
): SimulatedPacket | null {
  const src = allDevices[srcId];
  const dst = allDevices[dstId];
  if (!src || !dst) return null;

  const srcIntf = Object.values(src.interfaces)[0];
  const dstIntf = Object.values(dst.interfaces)[0];
  const srcIp = srcIntf?.ip || '0.0.0.0';
  const dstIp = dstIntf?.ip || '0.0.0.0';

  let port = 80;
  if (protocol === 'SSH') port = 22;
  if (protocol === 'SQL') port = 3306;
  if (protocol === 'ICMP') port = 0;

  // Determine path
  const { path, dropNode, dropReason, matchedAcl } = computePath(
    srcId,
    dstId,
    protocol,
    port,
    allDevices,
    allLinks
  );

  const vlanId = srcIntf?.vlan || 1;

  const pdu: PduDetails = {
    layer1: {
      interfaceType: '1000BASE-T Gigabit / V.35 Serial WAN',
      media: 'Shielded Twisted Pair Cat6 / Serial DTE-DCE Cable',
      clockRate: 64000,
      duplex: 'Full Duplex (1000 Mbps / 1.544 Mbps)',
    },
    layer2: {
      srcMac: srcIntf?.mac || '00E0.F700.0001',
      dstMac: '0010.7BA1.0100', // Gateway MAC
      etherType: '0x0800 (IPv4)',
      dot1q: {
        tpid: '0x8100 (IEEE 802.1Q)',
        pcp: protocol === 'SSH' ? 4 : 0, // Priority
        dei: false,
        vid: vlanId,
      },
    },
    layer3: {
      srcIp,
      dstIp,
      protocol: protocol === 'ICMP' ? 'ICMP (1)' : 'TCP (6)',
      protocolNumber: protocol === 'ICMP' ? 1 : 6,
      ttl: 64,
      dscp: 'CS0 (Default Best-Effort)',
    },
    layer4: {
      type: protocol === 'ICMP' ? 'ICMP' : 'TCP',
      srcPort: 49152 + Math.floor(Math.random() * 10000),
      dstPort: port,
      icmpType: protocol === 'ICMP' ? 'Echo Request (Type 8, Code 0)' : undefined,
      flags: protocol !== 'ICMP' ? ['SYN', 'ACK'] : undefined,
    },
    payload: `Enterprise Payload: ${protocol} request packet -> ${dstIp}:${port}`,
  };

  return {
    id: `pkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    srcNodeId: srcId,
    dstNodeId: dstId,
    srcIp,
    dstIp,
    protocol,
    port,
    vlanId,
    currentPath: path,
    currentHopIndex: 0,
    progress: 0,
    status: dropNode ? 'in_transit' : 'in_transit', // will drop when reaching dropNode
    droppedAtNodeId: dropNode,
    dropReason,
    matchedAclRule: matchedAcl,
    pdu,
  };
}

function computePath(
  srcId: string,
  dstId: string,
  protocol: string,
  port: number,
  devices: Record<string, NetworkDevice>,
  links: NetworkLink[]
): { path: string[]; dropNode?: string; dropReason?: string; matchedAcl?: AclRule } {
  const r1 = devices['HQ-R1'];
  const r2 = devices['Branch-R2'];
  const isS0Up = r1?.interfaces['Serial0/0/0']?.status === 'up';
  const isS1Up = r1?.interfaces['Serial0/0/1']?.status === 'up';

  // Helper: path inside HQ LAN (Router-on-a-Stick via HQ-SW1 and HQ-R1)
  const isHqNode = (id: string) => ['PC-HR1', 'WS-ENG1', 'SRV-DMZ'].includes(id);
  const isBranchNode = (id: string) => ['PC-BRANCH'].includes(id);

  // If going to DMZ (SRV-DMZ), check ACL 101 on HQ-R1!
  let matchedAcl: AclRule | undefined;
  let dropNode: string | undefined;
  let dropReason: string | undefined;

  if (dstId === 'SRV-DMZ' && r1?.acls?.['101']) {
    const srcDev = devices[srcId];
    const srcIp = Object.values(srcDev?.interfaces || {})[0]?.ip || '';
    const isHr = srcIp.startsWith('192.168.10.');
    const isEng = srcIp.startsWith('192.168.20.');

    for (const rule of r1.acls['101']) {
      if (rule.protocol === 'icmp' && protocol === 'ICMP') {
        rule.hitCount++;
        matchedAcl = rule;
        break;
      }
      if (rule.protocol === 'tcp' && protocol !== 'ICMP') {
        const portMatch = !rule.port || Number(rule.port) === port;
        const srcMatch =
          rule.source === 'any' ||
          (isHr && rule.source === '192.168.10.0') ||
          (isEng && rule.source === '192.168.20.0');

        if (srcMatch && portMatch) {
          rule.hitCount++;
          matchedAcl = rule;
          if (rule.action === 'deny') {
            dropNode = 'HQ-R1';
            dropReason = `Filtered by ACL 101 Rule ${rule.seq} (DENY ${rule.protocol} port ${port}): ${rule.description}`;
          }
          break;
        }
      }
    }
  }

  // Branch communication
  if ((isHqNode(srcId) && isBranchNode(dstId)) || (isBranchNode(srcId) && isHqNode(dstId))) {
    if (!isS0Up && !isS1Up) {
      // Both serial links down!
      if (isHqNode(srcId)) {
        return {
          path: [srcId, 'HQ-SW1', 'HQ-R1'],
          dropNode: 'HQ-R1',
          dropReason: 'OSPF Failure: All Serial WAN links (S0/0/0 & S0/0/1) are DOWN.',
        };
      } else {
        return {
          path: [srcId, 'Branch-SW2', 'Branch-R2'],
          dropNode: 'Branch-R2',
          dropReason: 'OSPF Failure: All Serial WAN links are DOWN.',
        };
      }
    }

    if (isHqNode(srcId)) {
      const fullPath = [srcId, 'HQ-SW1', 'HQ-R1', 'Branch-R2', 'Branch-SW2', dstId];
      if (dropNode) {
        return { path: [srcId, 'HQ-SW1', 'HQ-R1'], dropNode, dropReason, matchedAcl };
      }
      return { path: fullPath, matchedAcl };
    } else {
      const fullPath = [srcId, 'Branch-SW2', 'Branch-R2', 'HQ-R1', 'HQ-SW1', dstId];
      if (dropNode) {
        return { path: [srcId, 'Branch-SW2', 'Branch-R2', 'HQ-R1'], dropNode, dropReason, matchedAcl };
      }
      return { path: fullPath, matchedAcl };
    }
  }

  // Local Inter-VLAN communication (Router-on-a-Stick)
  if (isHqNode(srcId) && isHqNode(dstId)) {
    const fullPath = [srcId, 'HQ-SW1', 'HQ-R1', 'HQ-SW1', dstId];
    if (dropNode) {
      return {
        path: [srcId, 'HQ-SW1', 'HQ-R1'],
        dropNode,
        dropReason,
        matchedAcl,
      };
    }
    return { path: fullPath, matchedAcl };
  }

  return { path: [srcId, dstId] };
}
