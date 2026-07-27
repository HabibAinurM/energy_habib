const router = require('express').Router();
const { Op } = require('sequelize');
const { SensorData, TarifListrik, EnergiHarian, Alert, SystemSettings, Device } = require('../models');
const { authenticate } = require('../middleware/auth');
const { getLocalYMD } = require('../utils/date');

// GET /api/dashboard
router.get('/', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const todayStr = getLocalYMD(now);
    const monthStart = `${todayStr.slice(0, 7)}-01`;

    const devices = await Device.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
    const deviceIds = devices.map(d => d.id);

    // Default to empty queries if no devices
    const deviceFilter = deviceIds.length ? { deviceId: { [Op.in]: deviceIds } } : { id: -1 };

    const [latest, tarif, settings, todayData, monthRows, unreadCount] = await Promise.all([
      SensorData.findOne({ where: deviceFilter, order: [['timestamp', 'DESC']] }),
      TarifListrik.findOne({ where: { userId: req.user.id, isActive: true } }),
      SystemSettings.findOne({ where: { userId: req.user.id } }),
      EnergiHarian.findOne({ where: { userId: req.user.id, tanggal: todayStr } }),
      EnergiHarian.findAll({ where: { userId: req.user.id, tanggal: { [Op.gte]: monthStart } }, attributes: ['totalEnergi', 'totalBiaya'] }),
      Alert.count({ where: { userId: req.user.id, isRead: false } }),
    ]);

    const harga = tarif?.hargaPerKwh ?? 1444.70;
    const batas = tarif?.batasBiayaBulanan ?? null;
    const voltMin = settings?.voltageMin ?? 190;
    const voltMax = settings?.voltageMax ?? 250;
    const currMax = settings?.currentMax ?? 20;

    const energiHariIni = todayData?.totalEnergi ?? 0;
    const biayaHariIni = energiHariIni * harga;
    const energiBulan = monthRows.reduce((s, r) => s + r.totalEnergi, 0);
    const biayaBulan = monthRows.reduce((s, r) => s + r.totalBiaya, 0);
    const persentase = batas ? (biayaBulan / batas) * 100 : 0;

    const tegangan = latest?.tegangan ?? 0;
    const arus = latest?.arus ?? 0;

    const statusTegangan = tegangan < voltMin ? 'low' : tegangan > voltMax ? 'high' : 'normal';
    const statusArus = arus > currMax ? 'high' : 'normal';

    return res.json({
      tegangan_terkini:    tegangan,
      arus_terkini:        arus,
      daya_terkini:        latest?.daya ?? 0,
      frekuensi_terkini:   latest?.frekuensi ?? 0,
      faktor_daya_terkini: latest?.faktorDaya ?? 0,
      energi_hari_ini:     parseFloat(energiHariIni.toFixed(4)),
      biaya_hari_ini:      parseFloat(biayaHariIni.toFixed(2)),
      biaya_bulan_ini:     parseFloat(biayaBulan.toFixed(2)),
      energi_bulan_ini:    parseFloat(energiBulan.toFixed(4)),
      max_daya_hari_ini:   todayData?.maxDaya ?? 0,
      avg_tegangan_hari_ini: todayData?.avgTegangan ?? 0,
      avg_arus_hari_ini:   todayData?.avgArus ?? 0,
      batas_biaya_bulanan: batas,
      persentase_biaya:    parseFloat(persentase.toFixed(2)),
      total_alert_unread:  unreadCount,
      harga_per_kwh:       harga,
      has_tarif:           !!tarif,
      status_tegangan:     statusTegangan,
      status_arus:         statusArus,
      last_updated:        latest?.timestamp ?? null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
