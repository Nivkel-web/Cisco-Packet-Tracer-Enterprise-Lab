# Cisco Packet Tracer Enterprise Lab: Cyber Simulator

An interactive, sci-fi cyber simulation and learning game modeled after high-stakes enterprise networking scenarios in **Cisco Packet Tracer**. Experience **802.1Q Router-on-a-Stick inter-VLAN routing**, **dynamic OSPFv2 routing with dual redundant serial failover**, **extended port ACL firewalls**, and a live **Cisco IOS CLI terminal**.

---

## Visual Lab Showcase & Tactical HUD

### 1. Enterprise Core & WAN Redundancy Architecture
![Cisco Enterprise Lab Topology Architecture](/src/assets/images/cisco_enterprise_topology_hud_1792401034581.jpg)
*Figure 1.1: Core enterprise router fabric featuring 802.1Q sub-interfaces, dual serial WAN paths, and dynamic OSPF Area 0 routing.*

---

### 2. Live Packet Tracer Simulation & Holographic Port ACL Barrier
![Cisco Packet Tracer Lab Simulation](/src/assets/images/cisco_packet_tracer_lab_screenshot_1792401035227.jpg)
*Figure 1.2: Real-time packet telemetry with 802.1Q dot1Q tags, photon pulse paths, and laser shield ACL 101 inspection.*

---

### 3. Production Cisco IOS Command Line Interface (CLI)
![Cisco IOS CLI Terminal Console](/src/assets/images/cisco_cli_terminal_hud_1792401035475.jpg)
*Figure 1.3: Dual CRT phosphor terminal displaying routing tables (`show ip route`), OSPF neighbor state machine, and ACL hit counters.*

---

## Lab Architecture & Key Protocols

```
               +----------------------------------------------------+
               |                CISCO ENTERPRISE LAB                |
               +----------------------------------------------------+
                                         |
                  +----------------------+----------------------+
                  |                                             |
          [ HQ-R1 Core Router ]                         [ Branch-R2 Edge ]
          (G0/0.10, .20, .30)                           (G0/0, S0/0/0, S0/0/1)
                  |                                             |
       === 802.1Q TRUNK ===                        ====== WAN MESH ======
                  |                                             |
          [ HQ-SW1 Switch ]                         S0/0/0: T1 Primary (Cost: 64)
          (Fa0/1, 10, 20, 24)                       S0/0/1: 512K Backup (Cost: 195)
                  |                                             |
     +------------+------------+                                |
     |            |            |                                |
 [PC-HR1]     [WS-ENG1]   [SRV-DMZ]                        [PC-BRANCH]
 (VLAN 10)    (VLAN 20)   (VLAN 30 + ACL 101)              (VLAN 40)
 192.168.10.x 192.168.20.x 192.168.30.10                   192.168.40.50
```

---

### 1. 802.1Q Router-on-a-Stick (ROAS) Inter-VLAN Routing

Router-on-a-Stick allows a single physical router interface (`GigabitEthernet0/0`) to route traffic between isolated Layer 2 Virtual Local Area Networks (VLANs) by attaching IEEE 802.1Q tags to Ethernet frames.

- **VLAN 10 (HR / Staff)**: Subnet `192.168.10.0/24`, Gateway: `192.168.10.1` (`G0/0.10`)
- **VLAN 20 (Engineering)**: Subnet `192.168.20.0/24`, Gateway: `192.168.20.1` (`G0/0.20`)
- **VLAN 30 (DMZ Servers)**: Subnet `192.168.30.0/24`, Gateway: `192.168.30.1` (`G0/0.30`)

#### Cisco IOS Configuration (`HQ-R1`):
```cisco
! Bring up physical trunk port
interface GigabitEthernet0/0
 no ip address
 duplex auto
 speed auto
 no shutdown
!
! Sub-interface for VLAN 10 (HR)
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
!
! Sub-interface for VLAN 20 (Engineering)
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
!
! Sub-interface for VLAN 30 (DMZ) with ACL inspection
interface GigabitEthernet0/0.30
 encapsulation dot1Q 30
 ip address 192.168.30.1 255.255.255.0
 ip access-group 101 out
```

---

### 2. Dynamic OSPF Routing Protocol & Redundant Serial Failover

The laboratory uses **OSPFv2 (RFC 2328)** operating in **Backbone Area 0**. Link costs are derived via the standard Cisco formula:

$$\text{OSPF Cost} = \frac{\text{Reference Bandwidth}}{\text{Interface Bandwidth}} = \frac{10^8 \text{ bps}}{\text{Bandwidth (bps)}}$$

- **Primary WAN Link (`Serial0/0/0`)**:
  - Bandwidth: $1,544\text{ Kbps}$ (T1 line)
  - OSPF Metric Cost: $\approx 64$
  - State: Preferred SPF shortest path
- **Redundant WAN Link (`Serial0/0/1`)**:
  - Bandwidth: $512\text{ Kbps}$ (Fractional T1)
  - OSPF Metric Cost: $\approx 195$
  - State: Standby failover path

#### Dynamic Failover Drill:
When the primary link is severed (via UI button or `shutdown` in CLI):
1. OSPF Dead Timer triggers link flap detection.
2. Link-State Advertisements (Type 1 LSAs) flood across Area 0.
3. Dijkstra’s Shortest Path First (SPF) algorithm executes.
4. Next-hop route automatically converges to `10.0.1.2` over `Serial0/0/1` in milliseconds with zero administrative intervention!

```cisco
router ospf 1
 router-id 1.1.1.1
 network 192.168.10.0 0.0.0.255 area 0
 network 192.168.20.0 0.0.0.255 area 0
 network 192.168.30.0 0.0.0.255 area 0
 network 10.0.0.0 0.0.0.3 area 0
 network 10.0.1.0 0.0.0.3 area 0
```

---

### 3. Extended Port ACL Firewall Security Policies

Extended Access Control List 101 inspects packets traversing toward the DMZ Server (`192.168.30.10`). It enforces granular Layer 4 port filtering:

```cisco
! Permit HTTP Web traffic from HR
access-list 101 permit tcp 192.168.10.0 0.0.0.255 host 192.168.30.10 eq 80

! Block SSH remote terminal from HR (Defend server management)
access-list 101 deny tcp 192.168.10.0 0.0.0.255 host 192.168.30.10 eq 22

! Allow SSH remote terminal from Engineering Workstation
access-list 101 permit tcp 192.168.20.0 0.0.0.255 host 192.168.30.10 eq 22

! Block direct MySQL Database connections (Port 3306) from untrusted subnets
access-list 101 deny tcp any host 192.168.30.10 eq 3306

! Permit ICMP Echo / Ping for diagnostic verification
access-list 101 permit icmp any any

! Permit remaining enterprise IP traffic
access-list 101 permit ip any any
```

---

## Interactive Features & Sci-Fi Visual Animations

- **Holographic Circuit Paths**: Glowing vector links showing multiplexed 802.1Q dot1Q frames.
- **Photon Pulse In-Flight Animation**: Real-time packet animation traversing hop-by-hop from end host through access switch, router sub-interfaces, and WAN serial links.
- **Electric Laser Firewall Deflection**: Real-time particle absorption animation when unauthorized packets hit ACL deny rules.
- **OSPF Convergence Chime & Link Flap Alert**: Synthesizer audio cues generated via Web Audio API (toggleable in top bar).
- **Packet Tracer 7-Layer PDU Inspector**: Click any in-flight envelope to view Layer 1 physical media, Layer 2 802.1Q tags (TPID `0x8100`, VID), Layer 3 IPv4 headers, Layer 4 TCP/ICMP flags, and ACL match details.
- **Full Cisco IOS Command Line Shell**: Interactive terminal with autocomplete, command history (`↑`/`↓`), and real commands (`show ip route`, `show ip ospf neighbor`, `show access-lists`, `ping`, `traceroute`, `conf t`, `interface`, `shutdown`, `no shutdown`).
- **Gamified CCNA Lab Challenges**: Complete guided missions with automated validation and victory confetti.

---

## Quick Start & Verification Commands

Open any terminal in the web app and try these commands:

| Command | Description |
| :--- | :--- |
| `show ip route` | View active routing table (Connected `C` and OSPF `O` routes) |
| `show ip ospf neighbor` | View OSPF adjacency states (`FULL/DROTHER` or `FULL/P2P`) |
| `show ip interface brief` | View interface status, IP assignment, and protocol state |
| `show access-lists` | View ACL 101 rules with real-time hit counters |
| `ping 192.168.40.50` | Send 5 ICMP echo packets across WAN to remote Branch |
| `traceroute 192.168.40.50` | Hop-by-hop route tracer through ROAS and Serial trunks |
| `conf t` $\rightarrow$ `int s0/0/0` $\rightarrow$ `shutdown` | Manually sever primary serial link and watch OSPF failover |
