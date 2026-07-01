const router = require('express').Router();
const { Op } = require('sequelize');
const {
  TarifListrik, Alert, EnergiHarian, PrediksiEnergi, SystemSettings, User, SensorData
} = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { generatePredictions } = require('../services/predictionService');
const { ALERT_LABELS } = require('../services/alertService');
const { getLocalYMD } = require('../utils/date');

// ════════════════════════════════════════════════════════════
//  TARIF LISTRIK
// ════════════════════════════════════════════════════════════

// GET /api/tarif
router.get('/tarif', authenticate, async (req, res) => {
  const tarifs = await TarifListrik.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
  res.json(tarifs);
});

// GET /api/tarif/active
router.get('/tarif/active', authenticate, async (req, res) => {
  const t = await TarifListrik.findOne({ where: { userId: req.user.id, isActive: true } });
  if (!t) return res.status(404).json({ message: 'Belum ada tarif aktif' });
  res.json(t);
});

// POST /api/tarif
router.post('/tarif', authenticate, async (req, res) => {
  try {
    const { namaTarif, hargaPerKwh, batasBiayaBulanan } = req.body;
    if (!namaTarif || !hargaPerKwh) return res.status(400).json({ error: 'namaTarif dan hargaPerKwh wajib diisi' });

    // Deactivate previous active tarifs for this user
    await TarifListrik.update({ isActive: false }, { where: { userId: req.user.id, isActive: true } });

    const t = await TarifListrik.create({
      namaTarif,
      hargaPerKwh:       parseFloat(hargaPerKwh),
      batasBiayaBulanan: batasBiayaBulanan ? parseFloat(batasBiayaBulanan) : null,
      isActive:          true,
      userId:            req.user.id,
      updatedById:       req.user.id,
    });
    res.status(201).json(t);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tarif/:id
router.put('/tarif/:id', authenticate, async (req, res) => {
  const t = await TarifListrik.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!t) return res.status(404).json({ error: 'Tarif tidak ditemukan' });
  
  const { namaTarif, hargaPerKwh, batasBiayaBulanan, isActive } = req.body;
  if (isActive) {
    await TarifListrik.update({ isActive: false }, { where: { userId: req.user.id, isActive: true } });
  }
  await t.update({ namaTarif, hargaPerKwh, batasBiayaBulanan, isActive, updatedById: req.user.id });
  res.json(t);
});

// DELETE /api/tarif/:id
router.delete('/tarif/:id', authenticate, async (req, res) => {
  const t = await TarifListrik.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!t) return res.status(404).json({ error: 'Tarif tidak ditemukan' });
  await t.destroy();
  res.json({ message: 'Tarif dihapus' });
});

// ════════════════════════════════════════════════════════════
//  ALERTS
// ════════════════════════════════════════════════════════════

// GET /api/alerts
router.get('/alerts', authenticate, async (req, res) => {
  const alerts = await Alert.findAll({ where: { userId: req.user.id }, order: [['timestamp', 'DESC']], limit: 200 });
  const mapped = alerts.map((a) => ({
    ...a.toJSON(),
    alert_type_display: ALERT_LABELS[a.alertType] || a.alertType,
  }));
  res.json(mapped);
});

// GET /api/alerts/unread
router.get('/alerts/unread', authenticate, async (req, res) => {
  const alerts = await Alert.findAll({
    where: { userId: req.user.id, isRead: false },
    order: [['timestamp', 'DESC']],
    limit: 20,
  });
  res.json(alerts.map((a) => ({ ...a.toJSON(), alert_type_display: ALERT_LABELS[a.alertType] })));
});

// POST /api/alerts/mark-all-read
router.post('/alerts/mark-all-read', authenticate, async (req, res) => {
  await Alert.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
  res.json({ message: 'Semua peringatan ditandai dibaca' });
});

// PATCH /api/alerts/:id/mark-read
router.patch('/alerts/:id/mark-read', authenticate, async (req, res) => {
  const a = await Alert.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!a) return res.status(404).json({ error: 'Alert tidak ditemukan' });
  await a.update({ isRead: true });
  res.json(a);
});

// ════════════════════════════════════════════════════════════
//  ENERGI HARIAN
// ════════════════════════════════════════════════════════════

// GET /api/energi-harian/range?days=30
router.get('/energi-harian/range', authenticate, async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = getLocalYMD(since);
  const data = await EnergiHarian.findAll({
    where: { userId: req.user.id, tanggal: { [Op.gte]: sinceStr } },
    order: [['tanggal', 'ASC']],
  });
  res.json(data);
});

// ════════════════════════════════════════════════════════════
//  PREDIKSI
// ════════════════════════════════════════════════════════════

// GET /api/prediksi/latest
router.get('/prediksi/latest', authenticate, async (req, res) => {
  const todayStr = getLocalYMD(new Date());
  const preds = await PrediksiEnergi.findAll({
    where: { userId: req.user.id, tanggalPrediksi: { [Op.gte]: todayStr } },
    order: [['tanggalPrediksi', 'ASC']],
    limit: 7,
  });
  res.json(preds);
});

// POST /api/prediksi/generate
router.post('/prediksi/generate', authenticate, async (req, res) => {
  const result = await generatePredictions(req.user.id);
  if (result.success) {
    res.json({ message: 'Prediksi berhasil dibuat', ...result });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// GET /api/prediksi/comparison?days=30
router.get('/prediksi/comparison', authenticate, async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 180);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = getLocalYMD(since);
  const todayStr = getLocalYMD(new Date());

  const [actual, predictions] = await Promise.all([
    EnergiHarian.findAll({
      where:  { userId: req.user.id, tanggal: { [Op.gte]: sinceStr } },
      order:  [['tanggal', 'ASC']],
      attributes: ['tanggal', 'totalEnergi', 'totalBiaya'],
    }),
    PrediksiEnergi.findAll({
      where:  { userId: req.user.id, tanggalPrediksi: { [Op.gte]: sinceStr } },
      order:  [['tanggalPrediksi', 'ASC']],
      attributes: ['tanggalPrediksi', 'prediksiEnergi', 'prediksiBiaya'],
    }),
  ]);

  res.json({ actual, predictions });
});

// ════════════════════════════════════════════════════════════
//  SYSTEM SETTINGS
// ════════════════════════════════════════════════════════════

// GET /api/settings
router.get('/settings', authenticate, async (req, res) => {
  const s = await SystemSettings.findOne({ where: { userId: req.user.id } });
  res.json(s || {});
});

// PUT /api/settings
router.put('/settings', authenticate, async (req, res) => {
  const [s, created] = await SystemSettings.findOrCreate({ where: { userId: req.user.id }, defaults: {} });
  const { voltageMin, voltageMax, currentMax, costWarningPercentage } = req.body;
  await s.update({ voltageMin, voltageMax, currentMax, costWarningPercentage });
  res.json(s);
});

// ════════════════════════════════════════════════════════════
//  USERS
// ════════════════════════════════════════════════════════════

// GET /api/users  (admin only)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  const users = await User.findAll({ attributes: ['id', 'username', 'email', 'role', 'isActive', 'createdAt'] });
  res.json(users);
});

// POST /api/users  (admin only)
router.post('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username dan password wajib diisi' });

    const exists = await User.findOne({ where: { username } });
    if (exists) return res.status(400).json({ error: 'Username sudah digunakan' });

    const user = await User.create({ username, email, password, role: role || 'user' });
    res.status(201).json({ id: user.id, username: user.username, email: user.email, role: user.role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id (admin only)
router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, isActive } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (username && username !== user.username) {
      const exists = await User.findOne({ where: { username } });
      if (exists) return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    user.username = username || user.username;
    user.email = email !== undefined ? email : user.email;
    if (password) user.password = password; // Akan di-hash oleh hook beforeUpdate/beforeSave
    user.role = role || user.role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({ id: user.id, username: user.username, email: user.email, role: user.role, isActive: user.isActive });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id (admin only)
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri' });
    }

    await user.destroy();
    res.json({ message: 'User berhasil dihapus' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
//  GENERATE SAMPLE DATA (dev only)
// ════════════════════════════════════════════════════════════

router.get('/generate-sample-data', authenticate, async (req, res) => {
  try {
    const { Device } = require('../models');
    
    // Pastikan user punya device
    const [device] = await Device.findOrCreate({ 
      where: { userId: req.user.id }, 
      defaults: { deviceId: `dummy-${req.user.id}`, name: 'Virtual Device' } 
    });

    const tarif = await TarifListrik.findOne({ where: { userId: req.user.id, isActive: true } });
    const harga = tarif?.hargaPerKwh ?? 1444.70;

    const records = [];
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 180); // 6 months back

    for (let i = 0; i < 180 * 24 * 4; i++) {
      const t = new Date(start.getTime() + i * 15 * 60 * 1000);
      const hour = t.getHours();
      const baseDaya = 150 + (hour >= 6 && hour <= 22 ? 120 : 20);
      const daya = Math.max(0, baseDaya + (Math.random() - 0.5) * 60);
      const tegangan = 220 + (Math.random() - 0.5) * 8;
      const arus = daya / tegangan;
      const energi = (daya * 0.25) / 1000;
      const frekuensi = 49.8 + Math.random() * 0.4;
      const faktorDaya = 0.82 + Math.random() * 0.16;

      records.push({ 
        tegangan: +tegangan.toFixed(2), 
        arus: +arus.toFixed(3), 
        daya: +daya.toFixed(1), 
        energi: +energi.toFixed(4), 
        frekuensi: +frekuensi.toFixed(2),
        faktorDaya: +faktorDaya.toFixed(2),
        deviceId: device.id,
        timestamp: t 
      });
    }

    // Batch insert
    await SensorData.bulkCreate(records, { ignoreDuplicates: true });

    // Rebuild daily aggregations
    const dateSet = [...new Set(records.map((r) => getLocalYMD(r.timestamp)))];
    const sequelize = require('../config/database');

    for (const dateStr of dateSet) {
      const rows = await SensorData.findAll({ 
        where: { 
          deviceId: device.id,
          [Op.and]: sequelize.literal(`DATE(timestamp) = '${dateStr}'`) 
        } 
      });
      if (!rows.length) continue;
      const totalEnergi = rows.reduce((s, r) => s + r.energi, 0);
      await EnergiHarian.upsert({
        tanggal:     dateStr,
        userId:      req.user.id,
        totalEnergi: +totalEnergi.toFixed(5),
        totalBiaya:  +(totalEnergi * harga).toFixed(2),
        avgTegangan: +(rows.reduce((s, r) => s + r.tegangan, 0) / rows.length).toFixed(2),
        avgArus:     +(rows.reduce((s, r) => s + r.arus, 0) / rows.length).toFixed(4),
        avgDaya:     +(rows.reduce((s, r) => s + r.daya, 0) / rows.length).toFixed(2),
        maxDaya:     +Math.max(...rows.map((r) => r.daya)).toFixed(2),
        dataCount:   rows.length,
      });
    }

    res.json({ message: `${records.length} data sample berhasil dibuat untuk ${dateSet.length} hari` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;