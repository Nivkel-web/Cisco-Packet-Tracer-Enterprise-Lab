export type DeviceType = 'router' | 'switch' | 'host' | 'server';

export interface DeviceInterface {
  name: string;
  ip?: string;
  subnetMask?: string;
  mac: string;
  status: 'up' | 'down' | 'administratively_down';
  vlan?: number;
  encapsulation?: 'dot1Q' | 'none';
  bandwidthKbps?: number;
  ospfCost?: number;
  isTrunk?: boolean;
}

export interface SubInterface {
  name: string; // e.g. "G0/0.10"
  vlan: number;
  ip: string;
  subnetMask: string;
  status: 'up' | 'down';
  encapsulation: 'dot1Q';
  aclInbound?: string;
  aclOutbound?: string;
}

export interface AclRule {
  seq: number;
  action: 'permit' | 'deny';
  protocol: 'ip' | 'tcp' | 'udp' | 'icmp';
  source: string; // 'any' or CIDR / IP
  sourceWildcard?: string;
  destination: string; // 'any' or host IP / CIDR
  destWildcard?: string;
  port?: number | string; // e.g., 80, 22, 3306
  portOperator?: 'eq' | 'gt' | 'lt';
  description?: string;
  hitCount: number;
}

export interface OspfNeighbor {
  neighborId: string; // e.g. "2.2.2.2"
  priority: number;
  state: 'DOWN' | 'INIT' | '2-WAY' | 'EXSTART' | 'EXCHANGE' | 'LOADING' | 'FULL';
  deadTime: number; // seconds
  address: string;
  interface: string;
}

export interface RouteEntry {
  type: 'C' | 'S' | 'O'; // Connected, Static, OSPF
  network: string;
  subnetMask: string;
  administrativeDistance: number;
  metric: number;
  nextHop?: string;
  outgoingInterface: string;
}

export interface NetworkDevice {
  id: string;
  hostname: string;
  type: DeviceType;
  model: string;
  x: number;
  y: number;
  interfaces: Record<string, DeviceInterface>;
  subInterfaces?: Record<string, SubInterface>;
  routingTable?: RouteEntry[];
  ospfNeighbors?: OspfNeighbor[];
  ospfProcessId?: number;
  ospfRouterId?: string;
  ospfArea?: number;
  acls?: Record<string, AclRule[]>;
  defaultGateway?: string;
  vlanDatabase?: Record<number, string>;
  isPowered: boolean;
}

export interface NetworkLink {
  id: string;
  sourceDevId: string;
  sourceIntf: string;
  targetDevId: string;
  targetIntf: string;
  type: 'ethernet' | 'trunk' | 'serial' | 'redundant_serial';
  bandwidthMbps: number;
  status: 'up' | 'down';
  isPrimary?: boolean;
  isRedundant?: boolean;
  color?: string;
}

export interface Dot1QTag {
  tpid: string; // "0x8100"
  pcp: number; // Priority Code Point (0-7)
  dei: boolean; // Drop Eligible Indicator
  vid: number; // VLAN Identifier (1-4094)
}

export interface PduDetails {
  layer1: {
    interfaceType: string;
    media: string;
    clockRate?: number;
    duplex: string;
  };
  layer2: {
    srcMac: string;
    dstMac: string;
    etherType: string;
    dot1q?: Dot1QTag;
  };
  layer3: {
    srcIp: string;
    dstIp: string;
    protocol: string;
    protocolNumber: number;
    ttl: number;
    dscp: string;
  };
  layer4: {
    type: 'TCP' | 'UDP' | 'ICMP' | 'OSPF';
    srcPort?: number;
    dstPort?: number;
    icmpType?: string;
    ospfPacketType?: string;
    flags?: string[];
  };
  payload: string;
}

export interface SimulatedPacket {
  id: string;
  timestamp: number;
  srcNodeId: string;
  dstNodeId: string;
  srcIp: string;
  dstIp: string;
  protocol: 'ICMP' | 'HTTP' | 'SSH' | 'SQL' | 'OSPF_HELLO' | 'OSPF_LSU';
  port?: number;
  vlanId?: number;
  currentPath: string[]; // Node IDs: ['PC-HR1', 'HQ-SW1', 'HQ-R1', 'Branch-R2', 'PC-BRANCH']
  currentHopIndex: number;
  progress: number; // 0 to 1 between current and next node
  status: 'in_transit' | 'delivered' | 'dropped_acl' | 'dropped_no_route' | 'dropped_link_down';
  dropReason?: string;
  droppedAtNodeId?: string;
  matchedAclRule?: AclRule;
  pdu: PduDetails;
  isReturnTrip?: boolean;
}

export interface LabMission {
  id: string;
  number: number;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  objective: string;
  description: string;
  hints: string[];
  verificationCriteria: string[];
  solutionSteps: string[];
  isCompleted: boolean;
  rewardPoints: number;
}

export interface PacketCaptureEvent {
  id: string;
  timestamp: string;
  source: string;
  destination: string;
  protocol: string;
  info: string;
  vlan?: number;
  action: 'PERMIT' | 'DENY' | 'FORWARD' | 'FAILOVER' | 'CONVERGED';
  linkUsed?: string;
}
