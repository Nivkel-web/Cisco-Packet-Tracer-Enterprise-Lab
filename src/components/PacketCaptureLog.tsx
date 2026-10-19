import React from 'react';
import { PacketCaptureEvent } from '../types/network';
import { Activity, ShieldCheck, ShieldAlert, GitBranch, ArrowRightLeft } from 'lucide-react';

interface PacketCaptureLogProps {
  events: PacketCaptureEvent[];
  onClear: () => void;
}

export const PacketCaptureLog: React.FC<PacketCaptureLogProps> = ({ events, onClear }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-[280px]">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="font-mono text-xs font-bold text-slate-100">
            REAL-TIME PACKET TELEMETRY & WIRESHARK EVENT STREAM
          </h3>
        </div>
        <button
          onClick={onClear}
          className="text-[11px] font-mono text-slate-400 hover:text-slate-200"
        >
          Clear Stream
        </button>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-1">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-[11px]">
            No packet telemetry yet. Dispatch a packet or run a CLI ping to capture traffic.
          </div>
        ) : (
          events.map((ev) => {
            const isDeny = ev.action === 'DENY';
            const isPermit = ev.action === 'PERMIT';
            const isFailover = ev.action === 'FAILOVER';

            return (
              <div
                key={ev.id}
                className={`px-2.5 py-1.5 rounded flex items-center justify-between text-[11px] border ${
                  isDeny
                    ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                    : isPermit
                    ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                    : isFailover
                    ? 'bg-amber-950/40 border-amber-900/60 text-amber-300'
                    : 'bg-slate-950/80 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">{ev.timestamp}</span>
                  <span
                    className={`px-1 py-0.2 rounded font-bold text-[9px] ${
                      isDeny
                        ? 'bg-rose-900/80 text-rose-200'
                        : isPermit
                        ? 'bg-emerald-900/80 text-emerald-200'
                        : isFailover
                        ? 'bg-amber-900/80 text-amber-200'
                        : 'bg-cyan-950 text-cyan-300'
                    }`}
                  >
                    {ev.action}
                  </span>
                  <span className="font-semibold text-slate-200">{ev.protocol}</span>
                  <span>
                    {ev.source} ➔ {ev.destination}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {ev.vlan && (
                    <span className="text-cyan-400 text-[10px]">802.1Q VID:{ev.vlan}</span>
                  )}
                  {ev.linkUsed && (
                    <span className="text-amber-400 text-[10px] font-semibold">{ev.linkUsed}</span>
                  )}
                  <span className="text-slate-400 text-[10px] max-w-xs truncate">{ev.info}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
