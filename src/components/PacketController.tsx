import React, { useState } from 'react';
import { Send, Play, Pause, FastForward, RotateCcw, ShieldAlert, Globe, Terminal, Database } from 'lucide-react';
import { sounds } from '../utils/audio';

interface PacketControllerProps {
  onDispatchPacket: (srcId: string, dstId: string, protocol: 'ICMP' | 'HTTP' | 'SSH' | 'SQL') => void;
  isSimPaused: boolean;
  onToggleSimPause: () => void;
  simSpeed: number;
  onSetSimSpeed: (speed: number) => void;
  onResetSim: () => void;
}

export const PacketController: React.FC<PacketControllerProps> = ({
  onDispatchPacket,
  isSimPaused,
  onToggleSimPause,
  simSpeed,
  onSetSimSpeed,
  onResetSim,
}) => {
  const [srcHost, setSrcHost] = useState('PC-HR1');
  const [dstHost, setDstHost] = useState('SRV-DMZ');
  const [protocol, setProtocol] = useState<'ICMP' | 'HTTP' | 'SSH' | 'SQL'>('HTTP');

  const handleSend = () => {
    sounds.playPacketTransmit();
    onDispatchPacket(srcHost, dstHost, protocol);
  };

  const handlePreset = (src: string, dst: string, proto: 'ICMP' | 'HTTP' | 'SSH' | 'SQL') => {
    setSrcHost(src);
    setDstHost(dst);
    setProtocol(proto);
    sounds.playPacketTransmit();
    onDispatchPacket(src, dst, proto);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header & Simulation Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-mono text-xs font-bold text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            <span>PACKET TRACER DISPATCHER & SIMULATION ENGINE</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-mono">
            Inject synthetic packets to test 802.1Q tagging, OSPF dynamic routing, and port ACL rules.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={onToggleSimPause}
            className={`p-1.5 rounded transition-colors ${
              isSimPaused ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isSimPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {isSimPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1 text-[11px] font-mono px-1">
            {[1, 2].map((s) => (
              <button
                key={s}
                onClick={() => onSetSimSpeed(s)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  simSpeed === s ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={onResetSim}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
            title="Reset Simulation State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Dispatch Form */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end font-mono text-xs">
        {/* Source */}
        <div className="space-y-1">
          <label className="text-slate-400 text-[11px]">Source Node</label>
          <select
            value={srcHost}
            onChange={(e) => setSrcHost(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-cyan-500"
          >
            <option value="PC-HR1">PC-HR1 (VLAN 10 · 192.168.10.15)</option>
            <option value="WS-ENG1">WS-ENG1 (VLAN 20 · 192.168.20.25)</option>
            <option value="SRV-DMZ">SRV-DMZ (VLAN 30 · 192.168.30.10)</option>
            <option value="PC-BRANCH">PC-BRANCH (VLAN 40 · 192.168.40.50)</option>
          </select>
        </div>

        {/* Destination */}
        <div className="space-y-1">
          <label className="text-slate-400 text-[11px]">Destination Node</label>
          <select
            value={dstHost}
            onChange={(e) => setDstHost(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-cyan-500"
          >
            <option value="SRV-DMZ">SRV-DMZ (VLAN 30 · 192.168.30.10)</option>
            <option value="PC-HR1">PC-HR1 (VLAN 10 · 192.168.10.15)</option>
            <option value="WS-ENG1">WS-ENG1 (VLAN 20 · 192.168.20.25)</option>
            <option value="PC-BRANCH">PC-BRANCH (VLAN 40 · 192.168.40.50)</option>
          </select>
        </div>

        {/* Protocol / Port */}
        <div className="space-y-1">
          <label className="text-slate-400 text-[11px]">Protocol / Service</label>
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-cyan-500"
          >
            <option value="HTTP">HTTP (Port 80 · Web Traffic)</option>
            <option value="SSH">SSH (Port 22 · Secure Shell)</option>
            <option value="ICMP">ICMP (Ping Echo · Layer 3)</option>
            <option value="SQL">MySQL (Port 3306 · DB Query)</option>
          </select>
        </div>

        {/* Submit */}
        <div>
          <button
            onClick={handleSend}
            disabled={srcHost === dstHost}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Packet</span>
          </button>
        </div>
      </div>

      {/* Preset Test Scenarios */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono text-slate-500 uppercase">Quick Labs:</span>

        <button
          onClick={() => handlePreset('PC-HR1', 'WS-ENG1', 'ICMP')}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-[11px] font-mono text-cyan-300 transition-colors flex items-center gap-1.5"
        >
          <span>Inter-VLAN (VLAN 10 ⇄ 20)</span>
        </button>

        <button
          onClick={() => handlePreset('PC-HR1', 'SRV-DMZ', 'HTTP')}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-[11px] font-mono text-emerald-300 transition-colors flex items-center gap-1.5"
        >
          <Globe className="w-3 h-3 text-emerald-400" />
          <span>HR ➔ DMZ HTTP:80 (PERMIT)</span>
        </button>

        <button
          onClick={() => handlePreset('PC-HR1', 'SRV-DMZ', 'SSH')}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-[11px] font-mono text-rose-300 transition-colors flex items-center gap-1.5"
        >
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span>HR ➔ DMZ SSH:22 (ACL DENY)</span>
        </button>

        <button
          onClick={() => handlePreset('WS-ENG1', 'SRV-DMZ', 'SSH')}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-[11px] font-mono text-cyan-300 transition-colors flex items-center gap-1.5"
        >
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span>Eng ➔ DMZ SSH:22 (PERMIT)</span>
        </button>

        <button
          onClick={() => handlePreset('PC-HR1', 'SRV-DMZ', 'SQL')}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-[11px] font-mono text-rose-300 transition-colors flex items-center gap-1.5"
        >
          <Database className="w-3 h-3 text-rose-400" />
          <span>DMZ MySQL:3306 (ACL DENY)</span>
        </button>

        <button
          onClick={() => handlePreset('PC-HR1', 'PC-BRANCH', 'ICMP')}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-[11px] font-mono text-amber-300 transition-colors flex items-center gap-1.5"
        >
          <span>WAN OSPF (HQ ➔ Branch)</span>
        </button>
      </div>
    </div>
  );
};
