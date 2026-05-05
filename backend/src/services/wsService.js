const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'energy-monitor-secret';

let wss = null;

function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws/energy/' });

  wss.on('connection', (ws, req) => {
    // Extract token from ?token=...
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const decoded = jwt.verify(token, SECRET);
        ws.userId = decoded.id;
      } catch (err) {
        console.error('[WS] Invalid token');
      }
    }

    console.log(`[WS] Client connected. Total: ${wss.clients.size}, UserId: ${ws.userId || 'guest'}`);

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {}
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected. Total:', wss.clients.size);
    });

    ws.on('error', (err) => console.error('[WS] Error:', err.message));
  });

  // Heartbeat: ping every 30s, drop dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  console.log('[WS] WebSocket server initialized at /ws/energy/');
  return wss;
}

function broadcast(type, data, targetUserId = null) {
  if (!wss) return;
  const payload = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      if (!targetUserId || client.userId === targetUserId) {
        client.send(payload);
      }
    }
  });
}

function broadcastSensorUpdate(sensorData, hargaPerKwh, userId) {
  broadcast('sensor_update', {
    tegangan:    sensorData.tegangan,
    arus:        sensorData.arus,
    daya:        sensorData.daya,
    energi:      sensorData.energi,
    frekuensi:   sensorData.frekuensi,
    faktorDaya:  sensorData.faktorDaya,
    timestamp:   sensorData.timestamp,
    harga_per_kwh: hargaPerKwh,
  }, userId);
}

function broadcastAlert(alert, userId) {
  broadcast('alert', {
    id:          alert.id,
    alertType:   alert.alertType,
    severity:    alert.severity,
    message:     alert.message,
    timestamp:   alert.timestamp,
  }, userId);
}

module.exports = { initWebSocket, broadcast, broadcastSensorUpdate, broadcastAlert };
