# Online multiplayer

MissionForge can be played by 1 to 4 people online. One player hosts a room; the others join with a 4-letter code or an invite link.

## How it works
- The host's browser runs the real game. Guests send their actions (install a part, approve a stage, choose a rocket…) to the host, and the host sends the shared design back to everyone about ten times a second.
- Each player takes one of the four roles: Systems Engineer (the host), Science Lead, Launch and Orbit Lead, Budget and Risk Manager. A stage locks only when every role approves; each player can approve only their own role, and the host signs for roles nobody took.
- Everyone walks the facility with their own engineer and sees the others moving, with their names above them.
- Messages go through a free public MQTT message server over a secure WebSocket (the same kind of connection as opening a web page), so it works on the same hotspot, on different hotspots, or on any Wi-Fi. No direct device-to-device connection is needed. Version 0.25 used peer-to-peer WebRTC, which many phone hotspots block; 0.25.3 switched to MQTT for that reason.
- The public brokers are shared and unencrypted beyond TLS: do not send personal information. Only player names, positions and design choices are sent.

## Testing (recommended: everyone on one hotspot)
1. Connect every laptop to the same Wi-Fi or phone hotspot (it needs internet for the first handshake).
2. Laptop 1: enter a name, choose **Host online**, **Create room**. Copy the invite link or read out the code.
3. Laptop 2: open the invite link (or choose **Join online** and type the code), enter a name, **Join**.
4. Laptop 1: **Start the mission for everyone**.

Any internet connection works, including different hotspots. If a public broker is down, the game tries a second one. The same-screen team mode (**Solo or same screen**) always works offline.

## Libraries and services
| Name | Link | Licence / terms | Used for |
|---|---|---|---|
| MQTT.js 5.10.1 (loaded from jsDelivr when you host or join) | https://github.com/mqttjs/MQTT.js | MIT | Connecting to the message server from the browser |
| EMQX public MQTT broker | https://www.emqx.com/en/mqtt/public-mqtt5-broker | Free public test broker | Passing messages between players (first choice) |
| HiveMQ public MQTT broker | https://www.hivemq.com/mqtt/public-mqtt-broker/ | Free public test broker | Passing messages between players (backup) |
