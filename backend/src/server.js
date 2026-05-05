require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

const sequelize = require('./config/database');
const { initWebSocket } = require('./services/wsService');

// Routes
const authRoutes       = require('./routes/auth');
const sensorRoutes     = require('./routes/sensorData');
const dashboardRoutes  = require('./routes/dashboard');
const apiRoutes        = require('./routes/api');

const app = express();
const server = http.createServer(app);

// ─── Middleware ───────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger (dev)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (!req.path.includes('/sensor-data') || req.method !== 'POST') {
      console.log(`[${new Date().toLocaleTimeString('id-ID')}] ${req.method} ${req.path}`);
    }
    next();
  });
}

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/sensor-data', sensorRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/devices', require('./routes/devices'));
app.use('/api',             apiRoutes);


// ─── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Serve React build (production) ───────────────────────
const frontendBuild = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  const indexPath = path.join(frontendBuild, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'Energy Monitor API', version: '1.0.0', docs: '/api' });
  }
});

// ─── Error handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log(`[DB] Connected (${sequelize.getDialect()})`);

    // Sync models (create tables if not exist)
    await sequelize.sync({ alter: true });

    // Init WebSocket
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════╗');
      console.log(`║  ⚡ Energy Monitor API Running         ║`);
      console.log(`║  http://localhost:${PORT}                 ║`);
      console.log(`║  ws://localhost:${PORT}/ws/energy/        ║`);
      console.log('╚════════════════════════════════════════╝\n');
    });
  } catch (err) {
    console.error('[Fatal] Gagal start server:', err.message);
    console.error('\nPastikan:');
    console.error('  1. Sudah jalankan: node src/scripts/setup.js');
    console.error('  2. Database bisa diakses');
    process.exit(1);
  }
}

startServer();
