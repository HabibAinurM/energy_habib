const { Alert, TarifListrik, EnergiHarian, SystemSettings, User } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

// Fungsi bantuan untuk mengirim pesan ke Telegram secara dinamis per user
async function sendTelegramAlert(message, userId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !userId) return; // Skip jika bot token tidak ada

  try {
    // Ambil telegramChatId dinamis dari database untuk user ini
    const user = await User.findByPk(userId);
    if (!user || !user.telegramChatId) return; // Skip jika user belum set Chat ID

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, {
      chat_id: user.telegramChatId,
      text: `⚠️ *ALERT ENERGI METER*\n\n${message}`,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('[Telegram] Gagal mengirim pesan:', error.message);
  }
}

// Alert type display names
const ALERT_LABELS = {
  voltage_low:       'Tegangan Rendah',
  voltage_high:      'Tegangan Tinggi',
  current_high:      'Arus Berlebih',
  cost_limit:        'Batas Biaya',
  prediction_spike:  'Prediksi Lonjakan',
};

async function createAlertIfNotRecent(data, userId, minutesCooldown = 30) {
  const since = new Date(Date.now() - minutesCooldown * 60 * 1000);
  const exists = await Alert.findOne({
    where: { userId, alertType: data.alertType, timestamp: { [Op.gte]: since } },
  });
  if (!exists) {
    await Alert.create({ ...data, userId });
    
    // Kirim notifikasi ke Telegram (dinamis per user)
    await sendTelegramAlert(data.message, userId);
    
    return true;
  }
  return false;
}

async function checkSensorAlerts(sensorData, userId) {
  if (!userId) return;
  const settings = await SystemSettings.findOne({ where: { userId } });
  const voltMin = settings?.voltageMin ?? 190;
  const voltMax = settings?.voltageMax ?? 250;
  const currMax = settings?.currentMax ?? 20;

  const { tegangan, arus } = sensorData;

  if (tegangan < voltMin) {
    await createAlertIfNotRecent({
      alertType: 'voltage_low',
      severity: 'warning',
      message: `Tegangan rendah: ${tegangan.toFixed(1)}V (batas minimum: ${voltMin}V)`,
      value: tegangan,
      threshold: voltMin,
    }, userId);
  } else if (tegangan > voltMax) {
    await createAlertIfNotRecent({
      alertType: 'voltage_high',
      severity: 'critical',
      message: `Tegangan tinggi: ${tegangan.toFixed(1)}V (batas maksimum: ${voltMax}V)`,
      value: tegangan,
      threshold: voltMax,
    }, userId);
  }

  if (arus > currMax) {
    await createAlertIfNotRecent({
      alertType: 'current_high',
      severity: 'critical',
      message: `Arus berlebih: ${arus.toFixed(2)}A (batas: ${currMax}A)`,
      value: arus,
      threshold: currMax,
    }, userId);
  }

  await checkCostLimit(settings, userId);
}

async function checkCostLimit(settings, userId) {
  const tarif = await TarifListrik.findOne({ where: { userId, isActive: true } });
  if (!tarif?.batasBiayaBulanan) return;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const rows = await EnergiHarian.findAll({
    where: { userId, tanggal: { [Op.gte]: monthStart } },
    attributes: ['totalBiaya'],
  });

  const totalBiaya = rows.reduce((s, r) => s + r.totalBiaya, 0);
  const pct = (totalBiaya / tarif.batasBiayaBulanan) * 100;
  const warnPct = settings?.costWarningPercentage ?? 80;

  if (pct >= 100) {
    await createAlertIfNotRecent({
      alertType: 'cost_limit',
      severity: 'critical',
      message: `Biaya bulanan melebihi batas! Rp ${totalBiaya.toFixed(0)} dari Rp ${tarif.batasBiayaBulanan}`,
      value: totalBiaya,
      threshold: tarif.batasBiayaBulanan,
    }, userId);
  } else if (pct >= warnPct) {
    await createAlertIfNotRecent({
      alertType: 'cost_limit',
      severity: 'warning',
      message: `Biaya bulanan mencapai ${pct.toFixed(1)}% dari batas. Rp ${totalBiaya.toFixed(0)} dari Rp ${tarif.batasBiayaBulanan}`,
      value: totalBiaya,
      threshold: tarif.batasBiayaBulanan,
    }, userId);
  }
}

async function createPredictionSpikeAlert(predictedEnergy, avgEnergy, userId) {
  if (avgEnergy <= 0) return;
  const spikePct = ((predictedEnergy - avgEnergy) / avgEnergy) * 100;
  if (spikePct > 30) {
    await Alert.create({
      userId,
      alertType: 'prediction_spike',
      severity: 'warning',
      message: `Prediksi lonjakan konsumsi ${spikePct.toFixed(1)}% di atas rata-rata (${predictedEnergy.toFixed(3)} vs rata-rata ${avgEnergy.toFixed(3)} kWh)`,
      value: predictedEnergy,
      threshold: avgEnergy * 1.3,
    });
    
    // Kirim notifikasi ke Telegram (dinamis per user)
    await sendTelegramAlert(`Prediksi lonjakan konsumsi ${spikePct.toFixed(1)}% di atas rata-rata (${predictedEnergy.toFixed(3)} vs rata-rata ${avgEnergy.toFixed(3)} kWh)`, userId);
  }
}

module.exports = { checkSensorAlerts, createPredictionSpikeAlert, ALERT_LABELS };