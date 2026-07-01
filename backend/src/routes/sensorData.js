const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { SensorData, EnergiHarian, TarifListrik, Device, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { checkSensorAlerts } = require('../services/alertService');
const { broadcastSensorUpdate } = require('../services/wsService');
const { getLocalYMD } = require('../utils/date');

// Helper: update atau create daily aggregation
async function updateDailyAggregation(sensorData, userId) {
  const dateStr = getLocalYMD(sensorData.timestamp);
  const tarif = await TarifListrik.findOne({ where: { userId, isActive: true } });
  const harga = tarif?.hargaPerKwh ?? 1444.70;

  const rows = await SensorData.findAll({
    where: {
      deviceId: sensorData.deviceId,
      [Op.and]: literal(`DATE(timestamp) = '${dateStr}'`)
    },
    order: [['timestamp', 'ASC']],
  });
  if (!rows.length) return;

  // ─── ESP32 mengirim nilai energi per interval (delta) ─────────
  // Karena ESP32 sudah menghitung selisih (delta_e) per pengiriman,
  // kita cukup menjumlahkan seluruh nilai energi untuk mendapatkan total harian.
  const totalEnergi = rows.reduce((s, r) => s + r.energi, 0);

  const avgTeg = rows.reduce((s, r) => s + r.tegangan, 0) / rows.length;
  const avgArus = rows.reduce((s, r) => s + r.arus, 0) / rows.length;
  const avgDaya = rows.reduce((s, r) => s + r.daya, 0) / rows.length;
  const maxDaya = Math.max(...rows.map((r) => r.daya));

  await EnergiHarian.upsert({
    tanggal: dateStr,
    userId: userId,
    totalEnergi: parseFloat(totalEnergi.toFixed(5)),
    totalBiaya: parseFloat((totalEnergi * harga).toFixed(2)),
    avgTegangan: parseFloat(avgTeg.toFixed(2)),
    avgArus: parseFloat(avgArus.toFixed(4)),
    avgDaya: parseFloat(avgDaya.toFixed(2)),
    maxDaya: parseFloat(maxDaya.toFixed(2)),
    dataCount: rows.length,
  });
}

// ─── FIELD MAPPING HELPER ───────────────────────────────
// ESP32 mengirim: voltage, current, power, energy, frequency, power_factor
// Database menyimpan: tegangan, arus, daya, energi
// Field tambahan (frequency, power_factor) disimpan jika kolom ada, diabaikan jika tidak
function mapEsp32Fields(body) {
  const {
    // Format ESP32 (bahasa Inggris)
    voltage, current, power, energy, frequency, power_factor, device_id,
    // Format langsung (bahasa Indonesia) — fallback
    tegangan, arus, daya, energi, frekuensi, faktorDaya, deviceId,
    timestamp,
  } = body;

  return {
    tegangan: parseFloat(voltage ?? tegangan),
    arus: parseFloat(current ?? arus),
    daya: parseFloat(power ?? daya),
    energi: parseFloat(energy ?? energi),
    frekuensi: (frequency ?? frekuensi) != null ? parseFloat(frequency ?? frekuensi) : null,
    faktorDaya: (power_factor ?? faktorDaya) != null ? parseFloat(power_factor ?? faktorDaya) : null,
    deviceId: device_id ?? deviceId ?? null,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  };
}

// ─── VALIDASI ───────────────────────────────────────────
function validateFields({ tegangan, arus, daya, energi }) {
  if (tegangan == null || arus == null || daya == null || energi == null)
    return 'tegangan/voltage, arus/current, daya/power, energi/energy wajib diisi';
  if (isNaN(tegangan) || tegangan < 0 || tegangan > 500)
    return 'tegangan tidak valid (0–500 V)';
  if (isNaN(arus) || arus < 0 || arus > 200)
    return 'arus tidak valid (0–200 A)';
  if (isNaN(daya) || daya < 0 || daya > 100000)
    return 'daya tidak valid (0–100000 W)';
  if (isNaN(energi) || energi < 0)
    return 'energi tidak valid (≥ 0 kWh)';
  return null;
}

// ─── POST /api/sensor-data  ───
router.post('/', async (req, res) => {
  try {
    const mapped = mapEsp32Fields(req.body);
    const err = validateFields(mapped);
    if (err) return res.status(400).json({ error: err });

    if (!mapped.deviceId) return res.status(400).json({ error: 'device_id wajib diisi' });

    let deviceRecord = await Device.findOne({ where: { deviceId: mapped.deviceId } });

    // Auto-register device jika belum terdaftar (assign ke user pertama/admin)
    if (!deviceRecord) {
      const adminUser = await User.findOne({ order: [['id', 'ASC']] });
      if (!adminUser) return res.status(500).json({ error: 'Tidak ada user terdaftar di sistem.' });

      deviceRecord = await Device.create({
        deviceId: mapped.deviceId,
        name: `Auto: ${mapped.deviceId}`,
        titikRumah: 'Auto Registered',
        userId: adminUser.id,
        status: 'aktif',
      });
      console.log(`[AutoRegister] Device '${mapped.deviceId}' didaftarkan ke user #${adminUser.id}`);
    }

    // Hanya simpan kolom yang ada di model
    const payload = {
      tegangan: mapped.tegangan,
      arus: mapped.arus,
      daya: mapped.daya,
      energi: mapped.energi,
      deviceId: deviceRecord.id,
      timestamp: mapped.timestamp,
    };

    // Simpan frekuensi & faktor daya jika kolom ada di model (opsional)
    // Aktifkan baris ini setelah menambahkan kolom ke migrasi/model:
    if (mapped.frekuensi != null) payload.frekuensi = mapped.frekuensi;
    if (mapped.faktorDaya != null) payload.faktorDaya = mapped.faktorDaya;

    const data = await SensorData.create(payload);

    // Background tasks (non-blocking)
    setImmediate(async () => {
      try {
        await updateDailyAggregation(data, deviceRecord.userId);
        await checkSensorAlerts(data, deviceRecord.userId);
        const tarif = await TarifListrik.findOne({ where: { userId: deviceRecord.userId, isActive: true } });
        broadcastSensorUpdate(data, tarif?.hargaPerKwh ?? 1444.70); // TODO: broadcast only to specific user room
      } catch (e) {
        console.error('[Background]', e.message);
      }
    });

    const responsePayload = {
      id: data.id,
      tegangan: data.tegangan,
      arus: data.arus,
      daya: data.daya,
      energi: data.energi,
      frekuensi: data.frekuensi,
      faktorDaya: data.faktorDaya,
      timestamp: data.timestamp,
    };

    // Check if there is pending WiFi configuration
    if (deviceRecord.targetWifiSsid) {
      responsePayload.wifi_config = {
        ssid: deviceRecord.targetWifiSsid,
        password: deviceRecord.targetWifiPassword,
      };

      // Clear the target WiFi configuration so it's only sent once
      setImmediate(async () => {
        try {
          await deviceRecord.update({ targetWifiSsid: null, targetWifiPassword: null });
        } catch (e) {
          console.error('[WiFi Config Clear Error]', e.message);
        }
      });
    }

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sensor-data/realtime
router.get('/realtime', authenticate, async (req, res) => {
  const devices = await Device.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
  const deviceIds = devices.map(d => d.id);

  if (!deviceIds.length) return res.status(404).json({ message: 'Belum ada perangkat' });

  const latest = await SensorData.findOne({
    where: { deviceId: { [Op.in]: deviceIds } },
    order: [['timestamp', 'DESC']]
  });
  if (!latest) return res.status(404).json({ message: 'Belum ada data' });
  return res.json(latest);
});

// GET /api/sensor-data/history?hours=24
router.get('/history', authenticate, async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 24, 720);
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const devices = await Device.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
  const deviceIds = devices.map(d => d.id);

  let data = await SensorData.findAll({
    where: { timestamp: { [Op.gte]: since }, deviceId: { [Op.in]: deviceIds } },
    order: [['timestamp', 'ASC']],
    attributes: ['id', 'tegangan', 'arus', 'daya', 'energi', 'timestamp', 'deviceId'],
  });

  // Downsample ke maks 500 titik
  if (data.length > 500) {
    const step = Math.ceil(data.length / 500);
    data = data.filter((_, i) => i % step === 0);
  }

  return res.json({ count: data.length, data });
});

// GET /api/sensor-data/hourly-stats?hours=24
router.get('/hourly-stats', authenticate, async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 24, 720);
  const since = new Date(Date.now() - hours * 3600 * 1000);
  const sinceStr = since.toISOString().slice(0, 19).replace('T', ' ');

  try {
    const devices = await Device.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
    const deviceIds = devices.map(d => d.id);
    if (!deviceIds.length) return res.json([]);

    const sequelize = require('../config/database');
    const stats = await sequelize.query(`
      SELECT
        DATE_FORMAT(timestamp, '%Y-%m-%dT%H:00:00Z') AS hour,
        AVG(tegangan) AS avg_tegangan,
        AVG(arus)     AS avg_arus,
        AVG(daya)     AS avg_daya,
        SUM(energi)   AS total_energi
      FROM sensor_data
      WHERE timestamp >= '${sinceStr}' AND deviceId IN (${deviceIds.join(',')})
      GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%dT%H:00:00Z')
      ORDER BY hour ASC
    `, { type: sequelize.QueryTypes.SELECT });

    return res.json(stats);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Query error' });
  }
});

// GET /api/sensor-data/test-telegram (TEMPORARY ROUTE UNTUK TESTING)
router.get('/test-telegram', async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN tidak ditemukan di env' });

  try {
    const adminUser = await User.findOne({ order: [['id', 'ASC']] });
    if (!adminUser || !adminUser.telegramChatId) {
      return res.status(404).json({ error: 'User admin tidak ditemukan atau belum punya telegramChatId' });
    }

    const axios = require('axios');
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: adminUser.telegramChatId,
      text: '🤖 *TES DARI ENDPOINT API*\n\nBerhasil mengirim dari dalam Docker!',
      parse_mode: 'Markdown'
    });

    return res.json({ success: true, message: 'Pesan terkirim ke ' + adminUser.username, telegramResponse: response.data.result.text });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Gagal mengirim', detail: error.message });
  }
});

// GET /api/sensor-data/test-simulate-alert (TEMPORARY ROUTE UNTUK TESTING ALERT)
router.get('/test-simulate-alert', async (req, res) => {
  try {
    const adminUser = await User.findOne({ order: [['id', 'ASC']] });
    if (!adminUser) return res.status(404).json({ error: 'Tidak ada user' });

    const testData = {
      alertType: 'voltage_high',
      severity: 'critical',
      message: `[SIMULASI] Tegangan sangat tinggi: 265V (batas maksimum: 250V). Bahaya kerusakan alat!`,
      value: 265,
      threshold: 250,
    };

    // Panggil fungsi pembuat alert secara langsung
    const { Alert } = require('../models');
    const { getLocalYMD } = require('../utils/date');
    const { Op } = require('sequelize');
    
    // Abaikan sistem cooldown 30 menit khusus untuk test ini agar selalu terkirim
    await Alert.create({ ...testData, userId: adminUser.id });
    
    const axios = require('axios');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token && adminUser.telegramChatId) {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: adminUser.telegramChatId,
        text: `⚠️ *ALERT ENERGI METER*\n\n${testData.message}`,
        parse_mode: 'Markdown'
      });
    }

    return res.json({ success: true, message: 'Simulasi Peringatan Tegangan Tinggi Berhasil Dipicu!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menjalankan simulasi' });
  }
});

module.exports = router;