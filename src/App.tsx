import React, { useState, useEffect, useRef } from 'react';
import {
  INITIAL_DEVICES,
  INITIAL_LINKS,
  LAB_MISSIONS,
} from './data/initialTopology';
import {
  NetworkDevice,
  NetworkLink,
  SimulatedPacket,
  LabMission,
  PacketCaptureEvent,
} from './types/network';
import { createPacket } from './utils/packetSimulator';
import { sounds } from './utils/audio';
import { TopologyView } from './components/TopologyView';
import { CiscoTerminal } from './components/CiscoTerminal';
import { PacketController } from './components/PacketController';
import { MissionsPanel } from './components/MissionsPanel';
import { PacketCaptureLog } from './components/PacketCaptureLog';
import { PduInspector } from './components/PduInspector';
import { LabReferenceModal } from './components/LabReferenceModal';
import {
  Cpu,
  Volume2,
  VolumeX,
  BookOpen,
  Zap,
  Activity,
  Layers,
  Terminal,
  Shield,
  HelpCircle,
} from 'lucide-react';

export default function App() {
  const [devices, setDevices] = useState<Record<string, NetworkDevice>>(INITIAL_DEVICES);
  const [links, setLinks] = useState<NetworkLink[]>(INITIAL_LINKS);
  const [missions, setMissions] = useState<LabMission[]>(LAB_MISSIONS);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('HQ-R1');
  const [activePackets, setActivePackets] = useState<SimulatedPacket[]>([]);
  const [inspectedPacket, setInspectedPacket] = useState<SimulatedPacket | null>(null);
  const [captureEvents, setCaptureEvents] = useState<PacketCaptureEvent[]>([]);
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(sounds.isMuted());
  const [isReferenceOpen, setIsReferenceOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'topology' | 'cli' | 'missions' | 'telemetry'>('topology');

  // Check if primary serial link is down (failover active)
  const primarySerialLink = links.find((l) => l.id === 'LINK-SERIAL-PRIMARY');
  const backupSerialLink = links.find((l) => l.id === 'LINK-SERIAL-BACKUP');
  const isFailoverActive = primarySerialLink?.status === 'down' && backupSerialLink?.status === 'up';

  // Packet animation engine
  useEffect(() => {
    if (isSimPaused || activePackets.length === 0) return;

    const interval = setInterval(() => {
      setActivePackets((prevPackets) => {
        const nextPackets: SimulatedPacket[] = [];

        for (const pkt of prevPackets) {
          if (pkt.status.startsWith('dropped') || pkt.status === 'delivered') {
            // Keep completed packets for a short delay then remove
            if (Date.now() - pkt.timestamp > 3000) {
              continue;
            }
            nextPackets.push(pkt);
            continue;
          }

          const speedIncrement = 0.05 * simSpeed;
          const nextProgress = pkt.progress + speedIncrement;

          if (nextProgress < 1) {
            nextPackets.push({
              ...pkt,
              progress: nextProgress,
            });
          } else {
            // Reached next hop
            const nextHopIndex = pkt.currentHopIndex + 1;
            const currentNodeId = pkt.currentPath[nextHopIndex];

            // Check if dropped here
            if (pkt.droppedAtNodeId === currentNodeId) {
              const isAclDrop = pkt.dropReason?.includes('ACL');
              if (isAclDrop) {
                sounds.playAclDeny();
              }
              const updatedPkt: SimulatedPacket = {
                ...pkt,
                currentHopIndex: nextHopIndex,
                progress: 1,
                status: isAclDrop ? 'dropped_acl' : 'dropped_link_down',
              };
              nextPackets.push(updatedPkt);

              // Add telemetry event
              addCaptureEvent({
                source: pkt.srcIp,
                destination: pkt.dstIp,
                protocol: pkt.protocol,
                action: isAclDrop ? 'DENY' : 'DENY',
                vlan: pkt.vlanId,
                info: pkt.dropReason || 'Dropped at router',
              });
              continue;
            }

            // Check if destination reached
            if (nextHopIndex >= pkt.currentPath.length - 1) {
              sounds.playAclPermit();
              const deliveredPkt: SimulatedPacket = {
                ...pkt,
                currentHopIndex: nextHopIndex,
                progress: 1,
                status: 'delivered',
              };
              nextPackets.push(deliveredPkt);

              addCaptureEvent({
                source: pkt.srcIp,
                destination: pkt.dstIp,
                protocol: pkt.protocol,
                action: 'PERMIT',
                vlan: pkt.vlanId,
                info: `Delivered to destination node ${currentNodeId} successfully`,
              });

              // Check mission completions automatically
              checkAutoMissions(pkt);
              continue;
            }

            // Continue to next hop
            sounds.playDot1QTag();
            nextPackets.push({
              ...pkt,
              currentHopIndex: nextHopIndex,
              progress: 0,
            });
          }
        }

        return nextPackets;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimPaused, activePackets, simSpeed]);

  const addCaptureEvent = (eventData: Omit<PacketCaptureEvent, 'id' | 'timestamp'>) => {
    const newEvent: PacketCaptureEvent = {
      id: `ev-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      ...eventData,
    };
    setCaptureEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
  };

  const handleDispatchPacket = (
    srcId: string,
    dstId: string,
    protocol: 'ICMP' | 'HTTP' | 'SSH' | 'SQL'
  ) => {
    const pkt = createPacket(srcId, dstId, protocol, devices, links);
    if (!pkt) return;

    setActivePackets((prev) => [...prev, pkt]);

    addCaptureEvent({
      source: pkt.srcIp,
      destination: pkt.dstIp,
      protocol: pkt.protocol,
      action: 'FORWARD',
      vlan: pkt.vlanId,
      info: `Dispatched from ${srcId} to ${dstId} across 802.1Q dot1Q fabric`,
    });
  };

  // Toggle Serial WAN Link state
  const handleToggleSerialLink = (linkId: string) => {
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id === linkId) {
          const nextStatus = l.status === 'up' ? 'down' : 'up';
          if (nextStatus === 'down') {
            sounds.playFailoverAlarm();
            addCaptureEvent({
              source: 'HQ-R1:S0/0/0',
              destination: 'Branch-R2:S0/0/0',
              protocol: 'OSPFv2',
              action: 'FAILOVER',
              info: '%OSPF-5-ADJCHG: Serial0/0/0 went DOWN. SPF convergence shifting to S0/0/1 backup!',
              linkUsed: 'Serial0/0/1',
            });
          } else {
            sounds.playOspfConvergence();
            addCaptureEvent({
              source: 'HQ-R1:S0/0/0',
              destination: 'Branch-R2:S0/0/0',
              protocol: 'OSPFv2',
              action: 'CONVERGED',
              info: '%OSPF-5-ADJCHG: Serial0/0/0 RESTORED to FULL. OSPF recalculated primary cost: 64.',
              linkUsed: 'Serial0/0/0',
            });
          }
          return { ...l, status: nextStatus };
        }
        return l;
      })
    );

    // Update HQ-R1 and Branch-R2 interface status
    setDevices((prev) => {
      const next = { ...prev };
      const r1 = next['HQ-R1'];
      const r2 = next['Branch-R2'];
      const isPrimary = linkId === 'LINK-SERIAL-PRIMARY';
      const intfKey = isPrimary ? 'Serial0/0/0' : 'Serial0/0/1';

      if (r1?.interfaces[intfKey]) {
        const cur = r1.interfaces[intfKey].status;
        r1.interfaces[intfKey].status = cur === 'up' ? 'administratively_down' : 'up';
      }
      if (r2?.interfaces[intfKey]) {
        const cur = r2.interfaces[intfKey].status;
        r2.interfaces[intfKey].status = cur === 'up' ? 'administratively_down' : 'up';
      }

      // Update routing tables
      const s0IsUp = r1.interfaces['Serial0/0/0']?.status === 'up';
      if (r1.routingTable) {
        r1.routingTable = r1.routingTable.map((route) => {
          if (route.type === 'O' && route.network === '192.168.40.0') {
            return {
              ...route,
              metric: s0IsUp ? 65 : 196,
              nextHop: s0IsUp ? '10.0.0.2' : '10.0.1.2',
              outgoingInterface: s0IsUp ? 'Serial0/0/0' : 'Serial0/0/1',
            };
          }
          return route;
        });
      }
      return { ...next };
    });
  };

  const handleDeviceUpdate = (updatedDevice: NetworkDevice) => {
    setDevices((prev) => ({
      ...prev,
      [updatedDevice.id]: updatedDevice,
    }));
  };

  const handleLinkUpdates = (updates: { linkId: string; status: 'up' | 'down' }[]) => {
    setLinks((prev) =>
      prev.map((l) => {
        const match = updates.find((u) => u.linkId === l.id);
        if (match) {
          return { ...l, status: match.status };
        }
        return l;
      })
    );
  };

  const handleTriggerCliPacket = (srcId: string, dstIp: string) => {
    // Find device with dstIp
    const dstDev = Object.values(devices).find((d) =>
      Object.values(d.interfaces).some((i) => i.ip === dstIp)
    );
    if (dstDev) {
      handleDispatchPacket(srcId, dstDev.id, 'ICMP');
    }
  };

  const checkAutoMissions = (pkt: SimulatedPacket) => {
    // Mission 1: ROAS between HR and Eng
    if (
      (pkt.srcNodeId === 'PC-HR1' && pkt.dstNodeId === 'WS-ENG1') ||
      (pkt.srcNodeId === 'WS-ENG1' && pkt.dstNodeId === 'PC-HR1')
    ) {
      completeMission('mission-roas');
    }
    // Mission 2: OSPF between HQ and Branch
    if (
      (pkt.srcNodeId === 'PC-HR1' && pkt.dstNodeId === 'PC-BRANCH') ||
      (pkt.srcNodeId === 'PC-BRANCH' && pkt.dstNodeId === 'PC-HR1')
    ) {
      completeMission('mission-ospf-convergence');
    }
    // Mission 4: ACL test
    if (pkt.matchedAclRule) {
      completeMission('mission-acl-security');
    }
  };

  const completeMission = (missionId: string) => {
    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, isCompleted: true } : m))
    );
  };

  const handleToggleMute = () => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. Universal Top Bar Contract (1 row, 3 zones separated by gap-8) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950/95 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span className="text-base font-bold tracking-tight text-slate-100">
            Cisco Packet Tracer Enterprise Lab
          </span>
        </div>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-mono font-medium text-slate-400">
          <button
            onClick={() => setActiveView('topology')}
            className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'topology' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Topology Canvas
          </button>
          <button
            onClick={() => setActiveView('cli')}
            className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'cli' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Cisco IOS CLI
          </button>
          <button
            onClick={() => setActiveView('missions')}
            className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'missions' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Lab Missions
          </button>
          <button
            onClick={() => setActiveView('telemetry')}
            className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'telemetry' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Packet Telemetry
          </button>
          <button
            onClick={() => setIsReferenceOpen(true)}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 text-slate-300"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lab Cheatsheet</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleToggleMute}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => handleToggleSerialLink('LINK-SERIAL-PRIMARY')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all whitespace-nowrap shrink-0 border ${
              isFailoverActive
                ? 'bg-amber-950 text-amber-300 border-amber-600 hover:bg-amber-900'
                : 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
            }`}
          >
            {isFailoverActive ? 'Restore Primary T1' : 'Simulate Serial Failover'}
          </button>
        </div>
      </header>

      {/* 2. Main Content Canvas */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Sub-header info bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>ROAS 802.1Q: G0/0 (VLAN 10,20,30)</span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>OSPF Process 1 Area 0</span>
              <span className="text-emerald-400 font-bold">[CONVERGED]</span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-1.5 text-amber-300">
              <Shield className="w-3.5 h-3.5" />
              <span>ACL 101: 6 Active Rules</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Selected Device:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">
              {devices[selectedDeviceId]?.hostname} ({devices[selectedDeviceId]?.model})
            </span>
          </div>
        </div>

        {/* Core Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Network Topology Canvas & Packet Dispatcher */}
          <div className="lg:col-span-7 space-y-6">
            <TopologyView
              devices={devices}
              links={links}
              activePackets={activePackets}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
              onInspectPacket={(pkt) => setInspectedPacket(pkt)}
              onToggleSerialLink={handleToggleSerialLink}
              isFailoverActive={isFailoverActive}
            />

            <PacketController
              onDispatchPacket={handleDispatchPacket}
              isSimPaused={isSimPaused}
              onToggleSimPause={() => setIsSimPaused(!isSimPaused)}
              simSpeed={simSpeed}
              onSetSimSpeed={(s) => setSimSpeed(s)}
              onResetSim={() => {
                setActivePackets([]);
                setDevices(INITIAL_DEVICES);
                setLinks(INITIAL_LINKS);
                addCaptureEvent({
                  source: 'SYSTEM',
                  destination: 'FABRIC',
                  protocol: 'RESET',
                  action: 'CONVERGED',
                  info: 'Simulation reset to factory enterprise baseline.',
                });
              }}
            />

            <PacketCaptureLog
              events={captureEvents}
              onClear={() => setCaptureEvents([])}
            />
          </div>

          {/* Right Column: Cisco IOS CLI Terminal & Missions */}
          <div className="lg:col-span-5 space-y-6">
            <CiscoTerminal
              devices={devices}
              links={links}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
              onDeviceUpdate={handleDeviceUpdate}
              onLinkUpdates={handleLinkUpdates}
              onTriggerPacket={handleTriggerCliPacket}
            />

            <MissionsPanel
              missions={missions}
              onCompleteMission={completeMission}
            />
          </div>
        </div>
      </main>

      {/* 3. PDU Inspector Modal */}
      <PduInspector
        packet={inspectedPacket}
        onClose={() => setInspectedPacket(null)}
      />

      {/* 4. Lab Reference Cheatsheet Modal */}
      <LabReferenceModal
        isOpen={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
      />

      {/* 5. Minimal Clean Footer */}
      <footer className="mt-auto px-6 py-3 bg-slate-950 border-t border-slate-900 text-[11px] font-mono text-slate-500 flex items-center justify-between">
        <div>
          <span>Cisco Systems Enterprise Networking Standard · IEEE 802.1Q · RFC 2328 OSPFv2</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsReferenceOpen(true)}
            className="hover:text-cyan-400 transition-colors"
          >
            Engineering Docs
          </button>
          <span>·</span>
          <span>Simulation Mode: Active</span>
        </div>
      </footer>
    </div>
  );
}
