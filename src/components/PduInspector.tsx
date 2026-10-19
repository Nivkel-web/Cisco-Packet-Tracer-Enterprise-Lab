import React from 'react';
import { SimulatedPacket } from '../types/network';
import { Shield, Layers, Radio, Cpu, Network, CheckCircle2, XCircle, X } from 'lucide-react';

interface PduInspectorProps {
  packet: SimulatedPacket | null;
  onClose: () => void;
}

export const PduInspector: React.FC<PduInspectorProps> = ({ packet, onClose }) => {
  if (!packet) return null;

  const isDropped = packet.status.startsWith('dropped');
  const isAclDrop = packet.status === 'dropped_acl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-mono text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Cisco Packet Tracer PDU Inspector</span>
                <span className="text-xs font-normal text-slate-400">({packet.protocol})</span>
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Hop {packet.currentHopIndex + 1} of {packet.currentPath.length} · {packet.srcIp} ➔ {packet.dstIp}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Strip */}
        <div
          className={`px-4 py-2 flex items-center justify-between text-xs font-mono ${
            isDropped
              ? 'bg-rose-950/70 border-b border-rose-800/60 text-rose-300'
              : 'bg-emerald-950/70 border-b border-emerald-800/60 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {isDropped ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span className="font-semibold">
              {isAclDrop
                ? 'FIREWALL DROPPED (ACL 101 ENFORCEMENT)'
                : isDropped
                ? 'PACKET DROPPED'
                : 'PACKET TRANSMITTING / DELIVERED'}
            </span>
          </div>
          {packet.dropReason && <span className="text-rose-300/90 text-[11px]">{packet.dropReason}</span>}
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 font-mono text-xs">
          {/* ACL Firewall Match Alert if any */}
          {packet.matchedAclRule && (
            <div className="p-3 rounded-lg bg-slate-950 border border-amber-500/40 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Shield className="w-4 h-4" />
                <span>Router HQ-R1 ACL 101 Rule Match</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500">Sequence:</span>{' '}
                  <span className="text-slate-200">Rule {packet.matchedAclRule.seq}</span>
                </div>
                <div>
                  <span className="text-slate-500">Action:</span>{' '}
                  <span
                    className={`font-bold ${
                      packet.matchedAclRule.action === 'permit' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {packet.matchedAclRule.action.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Protocol/Port:</span>{' '}
                  <span className="text-slate-200">
                    {packet.matchedAclRule.protocol.toUpperCase()} {packet.matchedAclRule.port ? `eq ${packet.matchedAclRule.port}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Hit Matches:</span>{' '}
                  <span className="text-cyan-300">{packet.matchedAclRule.hitCount}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic pt-1">
                Policy Note: {packet.matchedAclRule.description}
              </p>
            </div>
          )}

          {/* 7-Layer OSI Model Breakdown */}
          <div className="space-y-2.5">
            <h4 className="text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              OSI 7-Layer PDU Breakdown
            </h4>

            {/* Layer 4: Transport */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-indigo-400 font-semibold">
                <span>Layer 4 - Transport Layer ({packet.pdu.layer4.type})</span>
                <span className="text-[10px] text-slate-400">Port {packet.port || 0}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-500">Src Port:</span> {packet.pdu.layer4.srcPort || 'Ephemeral'}
                </div>
                <div>
                  <span className="text-slate-500">Dst Port:</span> {packet.pdu.layer4.dstPort || packet.port}
                </div>
                {packet.pdu.layer4.icmpType && (
                  <div className="col-span-2">
                    <span className="text-slate-500">ICMP Type:</span> {packet.pdu.layer4.icmpType}
                  </div>
                )}
                {packet.pdu.layer4.flags && (
                  <div className="col-span-2">
                    <span className="text-slate-500">TCP Control Flags:</span> {packet.pdu.layer4.flags.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Layer 3: Network */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-cyan-400 font-semibold">
                <span>Layer 3 - Network Layer (IPv4)</span>
                <span className="text-[10px] text-slate-400">TTL: {packet.pdu.layer3.ttl}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-500">Source IPv4:</span> {packet.srcIp}
                </div>
                <div>
                  <span className="text-slate-500">Destination IPv4:</span> {packet.dstIp}
                </div>
                <div>
                  <span className="text-slate-500">Protocol:</span> {packet.pdu.layer3.protocol}
                </div>
                <div>
                  <span className="text-slate-500">DiffServ / DSCP:</span> {packet.pdu.layer3.dscp}
                </div>
              </div>
            </div>

            {/* Layer 2: Data Link + 802.1Q Dot1Q Tag */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-emerald-400 font-semibold">
                <span>Layer 2 - Data Link (Ethernet II + IEEE 802.1Q)</span>
                <span className="text-[10px] text-cyan-400 font-bold">
                  VLAN ID: {packet.vlanId || 1}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-500">Source MAC:</span> {packet.pdu.layer2.srcMac}
                </div>
                <div>
                  <span className="text-slate-500">Dest MAC:</span> {packet.pdu.layer2.dstMac}
                </div>
              </div>

              {/* 802.1Q Specific Header Box */}
              {packet.pdu.layer2.dot1q && (
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-800/60 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-cyan-300 font-bold">
                    <span>IEEE 802.1Q Dot1Q VLAN Tagging Field:</span>
                    <span>TPID: {packet.pdu.layer2.dot1q.tpid}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500">VLAN ID:</span>{' '}
                      <span className="text-cyan-300 font-bold">{packet.vlanId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">PCP Priority:</span>{' '}
                      <span className="text-slate-200">{packet.pdu.layer2.dot1q.pcp} (CoS)</span>
                    </div>
                    <div>
                      <span className="text-slate-500">DEI Flag:</span>{' '}
                      <span className="text-slate-200">0 (Eligible)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Layer 1: Physical */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-amber-400 font-semibold">
                <span>Layer 1 - Physical Interface</span>
                <span className="text-[10px] text-slate-400">{packet.pdu.layer1.interfaceType}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-500">Media:</span> {packet.pdu.layer1.media}
                </div>
                <div>
                  <span className="text-slate-500">Duplex/Rate:</span> {packet.pdu.layer1.duplex}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Simulation PDU Snapshot #{packet.id}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
