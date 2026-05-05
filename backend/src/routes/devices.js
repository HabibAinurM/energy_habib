const express = require('express');
const router = express.Router();
const { Device } = require('../models');
const { authenticate } = require('../middleware/auth');

// Helper to map DB camelCase to frontend snake_case
const mapToFrontend = (d) => ({
  id: d.id,
  device_id: d.deviceId,
  nama_perangkat: d.name,
  lokasi: d.lokasi,
  titik_rumah: d.titikRumah,
  daya_terpasang: d.dayaTerpasang,
  batas_kwh_harian: d.batasKwhHarian,
  batas_kwh_bulanan: d.batasKwhBulanan,
  keterangan: d.keterangan,
  status: d.status,
});

/* GET devices */
router.get('/', authenticate, async (req, res) => {
  try {
    const devices = await Device.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(devices.map(mapToFrontend));
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data perangkat' });
  }
});

/* POST device */
router.post('/', authenticate, async (req, res) => {
  const { nama_perangkat, device_id, titik_rumah, lokasi, daya_terpasang, batas_kwh_harian, batas_kwh_bulanan, keterangan } = req.body;

  if (!nama_perangkat || !device_id || !titik_rumah) {
    return res.status(400).json({ message: 'Field wajib belum diisi' });
  }

  try {
    const device = await Device.create({
      userId: req.user.id,
      name: nama_perangkat,
      deviceId: device_id,
      titikRumah: titik_rumah,
      lokasi,
      dayaTerpasang: daya_terpasang || 1300,
      batasKwhHarian: batas_kwh_harian || null,
      batasKwhBulanan: batas_kwh_bulanan || null,
      keterangan,
      status: 'nonaktif',
    });
    res.status(201).json({ id: device.id });
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Device ID sudah digunakan' });
    }
    res.status(500).json({ message: 'Gagal menambah perangkat' });
  }
});

/* PUT device */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const device = await Device.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!device) return res.status(404).json({ message: 'Perangkat tidak ditemukan' });

    const { nama_perangkat, device_id, titik_rumah, lokasi, daya_terpasang, batas_kwh_harian, batas_kwh_bulanan, keterangan } = req.body;
    
    await device.update({
      name: nama_perangkat,
      deviceId: device_id,
      titikRumah: titik_rumah,
      lokasi,
      dayaTerpasang: daya_terpasang,
      batasKwhHarian: batas_kwh_harian || null,
      batasKwhBulanan: batas_kwh_bulanan || null,
      keterangan,
    });
    res.json({ message: 'Berhasil diupdate' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Device ID sudah digunakan' });
    }
    res.status(500).json({ message: 'Gagal mengupdate perangkat' });
  }
});

/* PATCH device status */
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const device = await Device.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!device) return res.status(404).json({ message: 'Perangkat tidak ditemukan' });

    await device.update({ status: req.body.status });
    res.json({ message: 'Status diupdate' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengupdate status' });
  }
});

/* DELETE device */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const device = await Device.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!device) return res.status(404).json({ message: 'Perangkat tidak ditemukan' });

    await device.destroy();
    res.json({ message: 'Perangkat dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal menghapus perangkat' });
  }
});

module.exports = router;