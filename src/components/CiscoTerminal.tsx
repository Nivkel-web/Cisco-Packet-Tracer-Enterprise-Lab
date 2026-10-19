import React, { useState, useEffect, useRef } from 'react';
import { NetworkDevice, NetworkLink } from '../types/network';
import { CliSessionState, getPrompt, executeCommand } from '../utils/ciscoCliEngine';
import { sounds } from '../utils/audio';
import { Terminal, CornerDownLeft, Sparkles, HelpCircle, Trash2, ArrowUpRight } from 'lucide-react';

interface CiscoTerminalProps {
  devices: Record<string, NetworkDevice>;
  links: NetworkLink[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onDeviceUpdate: (updatedDevice: NetworkDevice) => void;
  onLinkUpdates?: (updates: { linkId: string; status: 'up' | 'down' }[]) => void;
  onTriggerPacket?: (srcId: string, dstIp: string) => void;
}

interface LogEntry {
  id: string;
  type: 'input' | 'output' | 'system';
  prompt?: string;
  content: string;
}

export const CiscoTerminal: React.FC<CiscoTerminalProps> = ({
  devices,
  links,
  selectedDeviceId,
  onSelectDevice,
  onDeviceUpdate,
  onLinkUpdates,
  onTriggerPacket,
}) => {
  const currentDevice = devices[selectedDeviceId] || devices['HQ-R1'];

  // Session state per device
  const [sessions, setSessions] = useState<Record<string, CliSessionState>>({});
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});
  const [currentInput, setCurrentInput] = useState('');
  const [historyPointer, setHistoryPointer] = useState<number>(-1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize device session and welcome banner if not present
  useEffect(() => {
    if (!sessions[selectedDeviceId]) {
      setSessions((prev) => ({
        ...prev,
        [selectedDeviceId]: {
          deviceId: selectedDeviceId,
          mode: currentDevice.type === 'host' || currentDevice.type === 'server' ? 'user' : 'privileged',
          commandHistory: [],
          historyIndex: -1,
        },
      }));
    }

    if (!logs[selectedDeviceId]) {
      const banner = currentDevice.type === 'router'
        ? `Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.4(3)M2\nEnterprise Router-on-a-Stick Inter-VLAN & Dynamic OSPF Engine Initialized.\nType 'show ip route', 'show ip ospf neighbor', or '?' for commands.`
        : currentDevice.type === 'switch'
        ? `Cisco IOS Catalyst 2960 Series Switch Software\n802.1Q Dot1Q Multi-VLAN Trunking Engine Active.\nType 'show vlan brief' or 'show interfaces trunk'.`
        : `Linux Enterprise Host Subsystem (${currentDevice.hostname})\nIPv4 Stack Configured. Type 'ipconfig', 'ping <ip>', or 'curl <url>'.`;

      setLogs((prev) => ({
        ...prev,
        [selectedDeviceId]: [
          {
            id: `init-${selectedDeviceId}`,
            type: 'system',
            content: banner,
          },
        ],
      }));
    }
  }, [selectedDeviceId, currentDevice]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, selectedDeviceId]);

  const activeSession: CliSessionState = sessions[selectedDeviceId] || {
    deviceId: selectedDeviceId,
    mode: 'privileged',
    commandHistory: [],
    historyIndex: -1,
  };

  const deviceLogs = logs[selectedDeviceId] || [];

  const handleSend = (textToSend?: string) => {
    const raw = textToSend !== undefined ? textToSend : currentInput;
    if (!raw.trim() && raw !== '') return;

    sounds.playKeyClick();
    const promptStr = getPrompt(currentDevice, activeSession);

    // If clearing screen
    if (raw.trim().toLowerCase() === 'clear' || raw.trim().toLowerCase() === 'cls') {
      setLogs((prev) => ({
        ...prev,
        [selectedDeviceId]: [],
      }));
      setCurrentInput('');
      setHistoryPointer(-1);
      return;
    }

    const { output, newSession, updatedDevice, linkUpdates, triggeredPing } = executeCommand(
      raw,
      currentDevice,
      activeSession,
      devices,
      links
    );

    // Update state
    setSessions((prev) => ({
      ...prev,
      [selectedDeviceId]: newSession,
    }));

    if (JSON.stringify(updatedDevice) !== JSON.stringify(currentDevice)) {
      onDeviceUpdate(updatedDevice);
    }

    if (linkUpdates && onLinkUpdates) {
      onLinkUpdates(linkUpdates);
    }

    if (triggeredPing && onTriggerPacket) {
      onTriggerPacket(triggeredPing.srcId, triggeredPing.dstIp);
    }

    setLogs((prev) => ({
      ...prev,
      [selectedDeviceId]: [
        ...(prev[selectedDeviceId] || []),
        { id: `in-${Date.now()}`, type: 'input', prompt: promptStr, content: raw },
        ...(output ? [{ id: `out-${Date.now()}`, type: 'output' as const, content: output }] : []),
      ],
    }));

    setCurrentInput('');
    setHistoryPointer(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = activeSession.commandHistory;
      if (history.length === 0) return;
      const nextPtr = historyPointer === -1 ? history.length - 1 : Math.max(0, historyPointer - 1);
      setHistoryPointer(nextPtr);
      setCurrentInput(history[nextPtr]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const history = activeSession.commandHistory;
      if (history.length === 0 || historyPointer === -1) return;
      const nextPtr = historyPointer + 1;
      if (nextPtr >= history.length) {
        setHistoryPointer(-1);
        setCurrentInput('');
      } else {
        setHistoryPointer(nextPtr);
        setCurrentInput(history[nextPtr]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple autocompletion
      const input = currentInput.toLowerCase().trim();
      const candidates = [
        'show ip route',
        'show ip ospf neighbor',
        'show ip ospf',
        'show ip interface brief',
        'show access-lists',
        'show vlan brief',
        'show running-config',
        'configure terminal',
        'interface GigabitEthernet0/0.10',
        'interface GigabitEthernet0/0.20',
        'interface GigabitEthernet0/0.30',
        'interface Serial0/0/0',
        'interface Serial0/0/1',
        'encapsulation dot1Q',
        'shutdown',
        'no shutdown',
        'ping 192.168.40.50',
        'ping 192.168.20.25',
        'ping 192.168.30.10',
        'ipconfig',
      ];
      const match = candidates.find((c) => c.toLowerCase().startsWith(input));
      if (match) {
        setCurrentInput(match);
      }
    }
  };

  // Quick Macro Command Buttons
  const getMacrosForDevice = () => {
    if (currentDevice.type === 'router') {
      return [
        { label: 'show ip route', cmd: 'show ip route' },
        { label: 'show ip ospf neighbor', cmd: 'show ip ospf neighbor' },
        { label: 'show ip int brief', cmd: 'show ip int br' },
        { label: 'show access-lists', cmd: 'show access-lists' },
        { label: 'ping Branch (192.168.40.50)', cmd: 'ping 192.168.40.50' },
        { label: 'shutdown S0/0/0', cmd: 'conf t\ninterface Serial0/0/0\nshutdown\nend' },
        { label: 'no shutdown S0/0/0', cmd: 'conf t\ninterface Serial0/0/0\nno shutdown\nend' },
      ];
    }
    if (currentDevice.type === 'switch') {
      return [
        { label: 'show vlan brief', cmd: 'show vlan brief' },
        { label: 'show int trunk', cmd: 'show interfaces trunk' },
        { label: 'show running-config', cmd: 'show running-config' },
      ];
    }
    return [
      { label: 'ipconfig', cmd: 'ipconfig' },
      { label: 'ping Gateway', cmd: `ping ${currentDevice.defaultGateway}` },
      { label: 'ping Eng WS (192.168.20.25)', cmd: 'ping 192.168.20.25' },
      { label: 'curl DMZ Web (Port 80)', cmd: 'curl http://192.168.30.10:80' },
      { label: 'ping Branch (192.168.40.50)', cmd: 'ping 192.168.40.50' },
    ];
  };

  return (
    <div className="flex flex-col h-[520px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Device Tabs Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <Terminal className="w-4 h-4 text-emerald-400 mr-1" />
          {Object.values(devices).map((dev) => {
            const isAct = dev.id === selectedDeviceId;
            return (
              <button
                key={dev.id}
                onClick={() => onSelectDevice(dev.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
                  isAct
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {dev.hostname}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setLogs((prev) => ({ ...prev, [selectedDeviceId]: [] }));
          }}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Clear Terminal Output"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Quick Macro Pills */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Quick Run:</span>
        {getMacrosForDevice().map((m, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (m.cmd.includes('\n')) {
                // Multi-line macro execution
                const lines = m.cmd.split('\n');
                lines.forEach((l) => handleSend(l));
              } else {
                handleSend(m.cmd);
              }
            }}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <span>{m.label}</span>
            <ArrowUpRight className="w-2.5 h-2.5 text-slate-500" />
          </button>
        ))}
      </div>

      {/* Terminal Screen / Log Area */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs text-emerald-400/90 leading-relaxed space-y-2 select-text"
        style={{
          textShadow: '0 0 5px rgba(52, 211, 153, 0.3)',
        }}
      >
        {deviceLogs.map((entry) => (
          <div key={entry.id} className="whitespace-pre-wrap">
            {entry.type === 'system' && (
              <div className="text-slate-400 pb-2 border-b border-slate-900 mb-2">
                {entry.content}
              </div>
            )}
            {entry.type === 'input' && (
              <div className="flex items-start text-cyan-300 font-semibold">
                <span className="text-slate-500 select-none mr-2">{entry.prompt}</span>
                <span>{entry.content}</span>
              </div>
            )}
            {entry.type === 'output' && (
              <div className="text-emerald-300 pl-4">{entry.content}</div>
            )}
          </div>
        ))}

        {/* Live Input Prompt Line */}
        <div className="flex items-center text-cyan-300">
          <span className="text-slate-500 select-none mr-2">
            {getPrompt(currentDevice, activeSession)}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-emerald-300 font-mono text-xs caret-cyan-400"
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>

      {/* Terminal Footer Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-t border-slate-800 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span>Mode: {activeSession.mode.toUpperCase()}</span>
          <span>·</span>
          <span>Tab: Autocomplete</span>
          <span>·</span>
          <span>↑/↓: Command History</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>Cisco IOS 15.4(3)M2</span>
        </div>
      </div>
    </div>
  );
};
