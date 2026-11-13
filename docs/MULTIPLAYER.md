# Online multiplayer

MissionForge can be played by 1 to 4 people online. One player hosts a room; the others join with a 4-letter code or an invite link.

## How it works
- The host's browser runs the real game. Guests send their actions (install a part, approve a stage, choose a rocket…) to the host, and the host sends the shared design back to everyone about ten times a second.
- Each player takes one of the four roles: Systems Engineer (the host), Science Lead, Launch and Orbit Lead, Budget and Risk Manager. A stage locks only when every role approves; each player can approve only their own role, and the host signs for roles nobody took.
- Everyone walks the facility with their own engineer and sees the others moving, with their names above them.
- Connections are peer-to-peer (WebRTC) through the PeerJS library. The free PeerJS cloud server only introduces the browsers; a free public TURN relay (Open Relay Project) is a backup if a direct connection is blocked.

## Testing (recommended: everyone on one hotspot)
1. Connect every laptop to the same Wi-Fi or phone hotspot (it needs internet for the first handshake).
2. Laptop 1: enter a name, choose **Host online**, **Create room**. Copy the invite link or read out the code.
3. Laptop 2: open the invite link (or choose **Join online** and type the code), enter a name, **Join**.
4. Laptop 1: **Start the mission for everyone**.

Separate mobile connections (for example two different phones' data) can block direct connections; the relay may help, but one shared hotspot is the reliable setup. The same-screen team mode (**Solo or same screen**) always works offline.

## Libraries and services
| Name | Link | Licence / terms | Used for |
|---|---|---|---|
| PeerJS 1.5.4 (loaded from jsDelivr when you host or join) | https://peerjs.com | MIT | Peer-to-peer connections and the free introduction server |
| Open Relay Project TURN servers | https://www.metered.ca/tools/openrelay/ | Free public relay | Backup relay when a direct connection is blocked |
