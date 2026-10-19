import React, { useRef } from 'react';
import { NetworkDevice, NetworkLink, SimulatedPacket } from '../types/network';
import {
  Server,
  Monitor,
  Network,
  Cpu,
  Shield,
  Activity,
  Zap,
  Radio,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface TopologyViewProps {
  devices: Record<string, NetworkDevice>;
  links: NetworkLink[];
  activePackets: SimulatedPacket[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onInspectPacket: (packet: SimulatedPacket) => void;
  onToggleSerialLink: (linkId: string) => void;
  isFailoverActive: boolean;
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  devices,
  links,
  activePackets,
  selectedDeviceId,
  onSelectDevice,
  onInspectPacket,
  onToggleSerialLink,
  isFailoverActive,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to get coordinates
  const getDevicePos = (id: string) => {
    const dev = devices[id];
    if (!dev) return { x: 0, y: 0 };
    return { x: dev.x, y: dev.y };
  };

  // Device Icon Mapper
  const renderDeviceIcon = (dev: NetworkDevice) => {
    switch (dev.type) {
      case 'router':
        return <Cpu className="w-6 h-6 text-cyan-400" />;
      case 'switch':
        return <Network className="w-5 h-5 text-indigo-400" />;
      case 'server':
        return <Server className="w-5 h-5 text-amber-400" />;
      case 'host':
        return <Monitor className="w-5 h-5 text-emerald-400" />;
    }
  };

  // Find Serial Links
  const primarySerial = links.find((l) => l.id === 'LINK-SERIAL-PRIMARY');
  const backupSerial = links.find((l) => l.id === 'LINK-SERIAL-BACKUP');

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden select-none shadow-2xl"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 60%),
          linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 32px 32px, 32px 32px',
      }}
    >
      {/* Sci-Fi HUD Corner Accents */}
      <div className="absolute top-3 left-4 flex items-center gap-3 pointer-events-none z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold tracking-wider text-cyan-400">
            ENTERPRISE TOPOLOGY HUD // AREA 0 BACKBONE
          </span>
        </div>
        <span className="text-slate-600 text-xs">|</span>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>802.1Q ROAS: ACTIVE</span>
          <span className="text-slate-600">·</span>
          <span>
            WAN: {isFailoverActive ? (
              <span className="text-amber-400 font-semibold">REDUNDANT SERIAL (S0/0/1)</span>
            ) : (
              <span className="text-emerald-400 font-semibold">PRIMARY T1 (S0/0/0)</span>
            )}
          </span>
        </div>
      </div>

      {/* Interactive Quick Failover Trigger Button */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => onToggleSerialLink('LINK-SERIAL-PRIMARY')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shadow-md ${
            primarySerial?.status === 'up'
              ? 'bg-rose-950/70 border border-rose-500/50 text-rose-300 hover:bg-rose-900/80 hover:border-rose-400'
              : 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-400'
          }`}
          title="Click to cut or restore the primary serial T1 link and observe dynamic OSPF SPF failover"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>
            {primarySerial?.status === 'up' ? 'Cut Primary Serial Link (S0/0/0)' : 'Restore Primary Serial Link (S0/0/0)'}
          </span>
        </button>
      </div>

      {/* SVG Canvas for Links & Active Laser Beams */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          {/* Laser Glow Filters */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Gradients */}
          <linearGradient id="trunk-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="serial-primary-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="serial-backup-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* 1. Render Links */}
        {links.map((link) => {
          const src = getDevicePos(link.sourceDevId);
          const tgt = getDevicePos(link.targetDevId);
          if (!src || !tgt) return null;

          const isDown = link.status === 'down';
          const isTrunk = link.type === 'trunk';
          const isPrimary = link.id === 'LINK-SERIAL-PRIMARY';
          const isBackup = link.id === 'LINK-SERIAL-BACKUP';

          // Curvature for redundant serial links
          let pathD = `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`;
          if (isPrimary) {
            // Upper arc for primary
            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2 - 32;
            pathD = `M ${src.x} ${src.y} Q ${midX} ${midY} ${tgt.x} ${tgt.y}`;
          } else if (isBackup) {
            // Lower arc for backup
            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2 + 32;
            pathD = `M ${src.x} ${src.y} Q ${midX} ${midY} ${tgt.x} ${tgt.y}`;
          }

          return (
            <g key={link.id}>
              {/* Outer Glow Line */}
              {!isDown && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={isTrunk ? '#06b6d4' : isPrimary ? '#10b981' : isBackup ? '#f59e0b' : '#334155'}
                  strokeWidth={isTrunk ? 5 : isPrimary ? 4 : 3}
                  strokeOpacity={0.25}
                  filter={isTrunk ? 'url(#glow-cyan)' : isPrimary ? 'url(#glow-emerald)' : 'url(#glow-amber)'}
                />
              )}

              {/* Main Line */}
              <path
                d={pathD}
                fill="none"
                stroke={
                  isDown
                    ? '#ef4444'
                    : isTrunk
                    ? 'url(#trunk-grad)'
                    : isPrimary
                    ? 'url(#serial-primary-grad)'
                    : isBackup
                    ? 'url(#serial-backup-grad)'
                    : '#475569'
                }
                strokeWidth={isDown ? 2 : isTrunk ? 3 : isPrimary ? 2.5 : 2}
                strokeDasharray={isDown ? '6 4' : isBackup && !isFailoverActive ? '4 4' : undefined}
                className={!isDown && (isTrunk || (isBackup && isFailoverActive) || isPrimary) ? 'transition-all' : ''}
              />

              {/* Trunk Multiplex Beads Animation */}
              {isTrunk && !isDown && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="6 14"
                  className="animate-[dash_1.5s_linear_infinite]"
                  style={{ animation: 'dash 2s linear infinite' }}
                />
              )}

              {/* Active Serial Beam Animation */}
              {((isPrimary && !isDown) || (isBackup && isFailoverActive && !isDown)) && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={isPrimary ? '#6ee7b7' : '#fde68a'}
                  strokeWidth={2}
                  strokeDasharray="8 24"
                  style={{ animation: 'dash 1.2s linear infinite' }}
                />
              )}
            </g>
          );
        })}

        {/* 2. In-Flight Simulated Packets */}
        {activePackets.map((pkt) => {
          if (pkt.currentHopIndex >= pkt.currentPath.length - 1) return null;
          const currDevId = pkt.currentPath[pkt.currentHopIndex];
          const nextDevId = pkt.currentPath[pkt.currentHopIndex + 1];
          const p1 = getDevicePos(currDevId);
          const p2 = getDevicePos(nextDevId);

          // Calculate current interpolated position
          let curX = p1.x + (p2.x - p1.x) * pkt.progress;
          let curY = p1.y + (p2.y - p1.y) * pkt.progress;

          // If serial hop, follow arc
          const isSerialHop =
            (currDevId === 'HQ-R1' && nextDevId === 'Branch-R2') ||
            (currDevId === 'Branch-R2' && nextDevId === 'HQ-R1');
          if (isSerialHop) {
            const arcOffset = isFailoverActive ? 32 : -32;
            const t = pkt.progress;
            // Quadratic bezier calculation
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 + arcOffset;
            curX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * midX + t * t * p2.x;
            curY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * midY + t * t * p2.y;
          }

          const isDropped = pkt.status.startsWith('dropped');
          const isAclDrop = pkt.status === 'dropped_acl';

          return (
            <g
              key={pkt.id}
              className="cursor-pointer pointer-events-auto"
              onClick={() => onInspectPacket(pkt)}
            >
              {/* Packet Halo */}
              <circle
                cx={curX}
                cy={curY}
                r={isDropped ? 14 : 9}
                fill={isDropped ? '#ef4444' : '#06b6d4'}
                fillOpacity={0.25}
                className={isDropped ? 'animate-ping' : ''}
              />
              {/* Packet Core */}
              <circle
                cx={curX}
                cy={curY}
                r={isDropped ? 7 : 5}
                fill={isDropped ? '#f87171' : '#38bdf8'}
                stroke={isDropped ? '#b91c1c' : '#ffffff'}
                strokeWidth={1.5}
              />

              {/* 802.1Q Tag Holographic Chip (when traversing trunk between SW1 and R1) */}
              {(currDevId === 'HQ-SW1' && nextDevId === 'HQ-R1') || (currDevId === 'HQ-R1' && nextDevId === 'HQ-SW1') ? (
                <g transform={`translate(${curX + 10}, ${curY - 14})`}>
                  <rect
                    width="62"
                    height="18"
                    rx="4"
                    fill="#082f49"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                  <text
                    x="31"
                    y="12"
                    fill="#38bdf8"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    802.1Q : {pkt.vlanId || 10}
                  </text>
                </g>
              ) : null}

              {/* Drop Notice */}
              {isDropped && (
                <g transform={`translate(${curX - 35}, ${curY - 25})`}>
                  <rect
                    width="70"
                    height="18"
                    rx="4"
                    fill="#450a0a"
                    stroke="#dc2626"
                    strokeWidth="1"
                  />
                  <text
                    x="35"
                    y="13"
                    fill="#fca5a5"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {isAclDrop ? 'ACL BLOCKED' : 'DROP'}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* 3. Link Annotation Badges & Serial WAN Bridge HUD */}
      {/* Primary Serial Label */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-105"
        style={{ left: (devices['HQ-R1'].x + devices['Branch-R2'].x) / 2, top: devices['HQ-R1'].y - 48 }}
        onClick={() => onToggleSerialLink('LINK-SERIAL-PRIMARY')}
      >
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] shadow-lg backdrop-blur-md ${
            primarySerial?.status === 'up'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${primarySerial?.status === 'up' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span>S0/0/0 (Primary T1 1.544M · OSPF Cost: 64)</span>
          {primarySerial?.status === 'down' && <span className="font-bold text-rose-400">[CUT]</span>}
        </div>
      </div>

      {/* Redundant Serial Label */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-105"
        style={{ left: (devices['HQ-R1'].x + devices['Branch-R2'].x) / 2, top: devices['HQ-R1'].y + 48 }}
        onClick={() => onToggleSerialLink('LINK-SERIAL-BACKUP')}
      >
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] shadow-lg backdrop-blur-md ${
            isFailoverActive
              ? 'bg-amber-950/90 border-amber-400 text-amber-200 ring-2 ring-amber-500/30'
              : backupSerial?.status === 'up'
              ? 'bg-slate-900/80 border-slate-700 text-slate-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isFailoverActive ? 'bg-amber-400 animate-pulse' : backupSerial?.status === 'up' ? 'bg-slate-400' : 'bg-rose-500'
            }`}
          />
          <span>
            S0/0/1 (Backup 512K · Cost: 195)
            {isFailoverActive ? ' — [ACTIVE OSPF FAILOVER]' : ' — [STANDBY]'}
          </span>
        </div>
      </div>

      {/* 802.1Q ROAS Trunk Label */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          left: devices['HQ-R1'].x,
          top: (devices['HQ-R1'].y + devices['HQ-SW1'].y) / 2,
        }}
      >
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] shadow backdrop-blur-sm">
          <span>802.1Q TRUNK (G0/0 ⇄ Fa0/1)</span>
          <span className="text-cyan-400 font-bold">VLAN 10,20,30</span>
        </div>
      </div>

      {/* Holographic ACL 101 Firewall Barrier Indicator on DMZ link */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{
          left: (devices['HQ-SW1'].x + devices['SRV-DMZ'].x) / 2 + 15,
          top: (devices['HQ-SW1'].y + devices['SRV-DMZ'].y) / 2 - 5,
        }}
      >
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/85 border border-amber-500/50 text-amber-300 font-mono text-[10px] shadow-lg backdrop-blur-md">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>ACL 101 FIREWALL</span>
          <span className="text-[9px] text-amber-400 font-bold">PORT INSPECT</span>
        </div>
      </div>

      {/* 4. Interactive Node Cards */}
      {Object.values(devices).map((dev) => {
        const isSelected = selectedDeviceId === dev.id;
        const isRouter = dev.type === 'router';
        const isServer = dev.type === 'server';
        const isSwitch = dev.type === 'switch';

        return (
          <div
            key={dev.id}
            onClick={() => onSelectDevice(dev.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-10 ${
              isSelected ? 'scale-105 ring-2 ring-cyan-400 shadow-cyan-500/30 shadow-xl' : 'hover:scale-102'
            }`}
            style={{ left: dev.x, top: dev.y }}
          >
            <div
              className={`relative px-3 py-2.5 rounded-lg border backdrop-blur-md transition-colors ${
                isSelected
                  ? 'bg-slate-900/95 border-cyan-400'
                  : 'bg-slate-900/85 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1 rounded bg-slate-800/80 border border-slate-700/50">
                  {renderDeviceIcon(dev)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-100">{dev.hostname}</span>
                    {isRouter && (
                      <span className="text-[9px] font-mono px-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                        OSPF Area 0
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">{dev.model}</p>
                </div>
              </div>

              {/* Sub-Interfaces / Ports Telemetry */}
              {isRouter && dev.subInterfaces && (
                <div className="space-y-0.5 pt-1 border-t border-slate-800/80 font-mono text-[9px]">
                  {Object.values(dev.subInterfaces).map((sub) => (
                    <div key={sub.name} className="flex items-center justify-between gap-2 text-slate-400">
                      <span className="text-cyan-400">{sub.name}</span>
                      <span>VLAN {sub.vlan}</span>
                      <span className="text-slate-300">{sub.ip}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Server Details */}
              {isServer && (
                <div className="pt-1 border-t border-slate-800/80 font-mono text-[9px] text-amber-300 flex items-center justify-between gap-2">
                  <span>192.168.30.10</span>
                  <span className="text-slate-400">Ports: 80, 22, 3306</span>
                </div>
              )}

              {/* Host IP & VLAN Badge */}
              {dev.type === 'host' && (
                <div className="pt-1 border-t border-slate-800/80 font-mono text-[9px] text-slate-400 flex items-center justify-between gap-2">
                  <span className="text-emerald-400">{Object.values(dev.interfaces)[0]?.ip}</span>
                  <span className="text-slate-500">VLAN {Object.values(dev.interfaces)[0]?.vlan}</span>
                </div>
              )}

              {/* Switch Ports */}
              {isSwitch && (
                <div className="pt-1 border-t border-slate-800/80 font-mono text-[9px] text-indigo-300 flex items-center justify-between gap-1">
                  <span>Trunk Fa0/1</span>
                  <span className="text-slate-400">4 Active Ports</span>
                </div>
              )}

              {/* Selection Indicator Ring */}
              {isSelected && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]" />
              )}
            </div>
          </div>
        );
      })}

      {/* Bottom HUD Legend */}
      <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
            <span>802.1Q Dot1Q Trunk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-emerald-500" />
            <span>Primary Serial Link (T1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-500 stroke-dash" />
            <span>Redundant Serial Link (512K)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>Port ACL 101</span>
          </div>
        </div>
        <div>
          <span>Click any node to launch CLI Terminal</span>
        </div>
      </div>
    </div>
  );
};
