import React, { useState } from 'react';
import { BookOpen, X, Cpu, Network, Shield, Server, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LabReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LabReferenceModal: React.FC<LabReferenceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'roas' | 'ospf' | 'acl' | 'gallery'>('roas');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-mono text-sm font-bold text-slate-100">
                Cisco Enterprise Lab Documentation & Engineering Reference
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                CCNA / CCNP Enterprise Design Guidelines: 802.1Q ROAS, OSPF Dynamic Routing, and ACL Firewalls
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 py-2 bg-slate-950/70 border-b border-slate-800 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('roas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
              activeTab === 'roas'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            1. 802.1Q Router-on-a-Stick
          </button>
          <button
            onClick={() => setActiveTab('ospf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
              activeTab === 'ospf'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            2. Dynamic OSPF & WAN Redundancy
          </button>
          <button
            onClick={() => setActiveTab('acl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
              activeTab === 'acl'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            3. Extended Port ACL Firewall
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
              activeTab === 'gallery'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            4. Visual Lab Gallery & Diagrams
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 space-y-4 leading-relaxed">
          {activeTab === 'roas' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40">
                <h3 className="text-cyan-300 text-sm font-bold mb-1">
                  Enterprise Router-on-a-Stick (802.1Q Inter-VLAN Routing)
                </h3>
                <p className="text-slate-300 text-[11px]">
                  Traditional routing requires a separate physical router interface for every VLAN. In
                  Router-on-a-Stick (ROAS), a single physical interface (e.g. <code>GigabitEthernet0/0</code>) is configured
                  with 802.1Q trunking to transport multiple virtual LANs simultaneously across virtual sub-interfaces.
                </p>
              </div>

              <div>
                <h4 className="text-slate-200 font-bold mb-2">Cisco IOS Configuration on HQ-R1:</h4>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-emerald-300 overflow-x-auto text-[11px]">
{`! Step 1: Enable the physical GigabitEthernet interface with no IP
interface GigabitEthernet0/0
 no ip address
 no shutdown
!
! Step 2: Configure sub-interface for VLAN 10 (HR/Staff)
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
!
! Step 3: Configure sub-interface for VLAN 20 (Engineering)
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
!
! Step 4: Configure sub-interface for VLAN 30 (DMZ Servers)
interface GigabitEthernet0/0.30
 encapsulation dot1Q 30
 ip address 192.168.30.1 255.255.255.0`}
                </pre>
              </div>

              <div>
                <h4 className="text-slate-200 font-bold mb-2">Catalyst Switch Trunk Configuration (HQ-SW1):</h4>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-cyan-300 overflow-x-auto text-[11px]">
{`interface FastEthernet0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
!
interface FastEthernet0/10
 switchport mode access
 switchport access vlan 10
!
interface FastEthernet0/20
 switchport mode access
 switchport access vlan 20`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'ospf' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                <h3 className="text-emerald-300 text-sm font-bold mb-1">
                  Dynamic OSPF Routing Protocol & Redundant Serial Failover
                </h3>
                <p className="text-slate-300 text-[11px]">
                  OSPF (Open Shortest Path First) is a link-state routing protocol that uses Dijkstra’s SPF algorithm.
                  Cost is computed using reference bandwidth:
                  <code className="text-amber-300 ml-1">Cost = 100,000,000 / Bandwidth(bps)</code>.
                  Because T1 (1.544 Mbps) has Cost 64 and 512 Kbps has Cost 195, traffic routes through Serial0/0/0 until a
                  failure occurs, triggering automatic sub-second SPF reconvergence to Serial0/0/1!
                </p>
              </div>

              <div>
                <h4 className="text-slate-200 font-bold mb-2">Dual Serial Link OSPF Configuration on HQ-R1:</h4>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-emerald-300 overflow-x-auto text-[11px]">
{`! Primary High-Bandwidth WAN Link (T1)
interface Serial0/0/0
 ip address 10.0.0.1 255.255.255.252
 bandwidth 1544
 clock rate 64000
!
! Redundant Secondary WAN Link (Backup 512K)
interface Serial0/0/1
 ip address 10.0.1.1 255.255.255.252
 bandwidth 512
 clock rate 64000
!
! Dynamic OSPF Process 1 in Area 0
router ospf 1
 router-id 1.1.1.1
 network 192.168.10.0 0.0.0.255 area 0
 network 192.168.20.0 0.0.0.255 area 0
 network 192.168.30.0 0.0.0.255 area 0
 network 10.0.0.0 0.0.0.3 area 0
 network 10.0.1.0 0.0.0.3 area 0`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'acl' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40">
                <h3 className="text-amber-300 text-sm font-bold mb-1">
                  Extended Port ACL Firewall Security Policies
                </h3>
                <p className="text-slate-300 text-[11px]">
                  Extended Access Control Lists (ACLs numbered 100–199) filter packets based on source IP, destination IP,
                  Layer 4 protocol (TCP/UDP/ICMP), and destination port. Traffic is evaluated top-to-bottom with first-match
                  semantics, followed by an implicit deny all.
                </p>
              </div>

              <div>
                <h4 className="text-slate-200 font-bold mb-2">Access Control List 101 Definition:</h4>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-amber-300 overflow-x-auto text-[11px]">
{`! Permit Web Traffic from HR to DMZ
access-list 101 permit tcp 192.168.10.0 0.0.0.255 host 192.168.30.10 eq 80

! Deny SSH Management from HR to DMZ
access-list 101 deny tcp 192.168.10.0 0.0.0.255 host 192.168.30.10 eq 22

! Permit SSH Management from Engineering to DMZ
access-list 101 permit tcp 192.168.20.0 0.0.0.255 host 192.168.30.10 eq 22

! Block Direct MySQL Database Probes (Port 3306)
access-list 101 deny tcp any host 192.168.30.10 eq 3306

! Permit ICMP Ping Echo
access-list 101 permit icmp any any

! Default Permit Remaining Traffic
access-list 101 permit ip any any`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <h3 className="text-slate-200 font-bold">Lab Architecture Visualizations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
                  <img
                    src="/src/assets/images/cisco_enterprise_topology_hud_1792401034581.jpg"
                    alt="Cisco Enterprise Lab Topology Architecture"
                    className="w-full h-44 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-2.5">
                    <h5 className="font-bold text-cyan-300 text-[11px]">Core & WAN Redundancy Architecture</h5>
                    <p className="text-[10px] text-slate-400">
                      Dual redundant serial links connecting enterprise core to remote edge.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
                  <img
                    src="/src/assets/images/cisco_packet_tracer_lab_screenshot_1792401035227.jpg"
                    alt="Cisco Packet Tracer Lab Simulation"
                    className="w-full h-44 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-2.5">
                    <h5 className="font-bold text-amber-300 text-[11px]">Interactive Packet Tracer HUD</h5>
                    <p className="text-[10px] text-slate-400">
                      Live packet tagging, ACL laser barrier inspection, and real-time telemetry.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950 md:col-span-2">
                  <img
                    src="/src/assets/images/cisco_cli_terminal_hud_1792401035475.jpg"
                    alt="Cisco IOS CLI Terminal Console"
                    className="w-full h-48 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-2.5">
                    <h5 className="font-bold text-emerald-300 text-[11px]">Cisco IOS Production Terminal</h5>
                    <p className="text-[10px] text-slate-400">
                      Authentic CLI console showing routing tables, OSPF neighbor states, and ACL hit counters.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-slate-500">
            Cisco Certified Network Associate (CCNA) Enterprise Lab Standard
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
