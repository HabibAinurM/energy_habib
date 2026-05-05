/**
 * Prediction Service
 * Menggunakan Simple Exponential Smoothing + Trend (Holt's Method)
 * sebagai alternatif LSTM yang ringan tanpa dependency Python/TensorFlow.
 * 
 * Untuk LSTM sejati, Anda bisa:
 * 1. Install brain.js: npm install brain.js
 * 2. Atau panggil Python script via child_process
 */

const { EnergiHarian, PrediksiEnergi, TarifListrik } = require('../models');
const { Op } = require('sequelize');
const { createPredictionSpikeAlert } = require('./alertService');

// ─── Holt's Double Exponential Smoothing ─────────────────
function holtsSmoothing(data, alpha = 0.4, beta = 0.3, horizon = 7) {
  if (data.length < 3) return [];

  let level = data[0];
  let trend = data[1] - data[0];

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const forecasts = [];
  for (let h = 1; h <= horizon; h++) {
    forecasts.push(Math.max(0, level + h * trend));
  }
  return forecasts;
}

// ─── Weighted Moving Average ──────────────────────────────
function weightedMovingAverage(data, window = 7) {
  if (data.length < 2) return data[data.length - 1] ?? 0;
  const slice = data.slice(-window);
  const weights = slice.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  return slice.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
}

// ─── Standard Deviation ──────────────────────────────────
function stdDev(data) {
  if (data.length < 2) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length;
  return Math.sqrt(variance);
}

// ─── Day-of-week seasonal factor ─────────────────────────
function getSeasonalFactors(historicalData) {
  const byDow = Array.from({ length: 7 }, () => []);

  historicalData.forEach(({ tanggal, totalEnergi }) => {
    const dow = new Date(tanggal).getDay(); // 0=Sun ... 6=Sat
    byDow[dow].push(totalEnergi);
  });

  const overall = historicalData.reduce((s, d) => s + d.totalEnergi, 0) / historicalData.length;

  return byDow.map((arr) => {
    if (arr.length === 0) return 1;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return overall > 0 ? avg / overall : 1;
  });
}

// ─── Main prediction function ─────────────────────────────
async function generatePredictions(userId) {
  try {
    const MIN_DAYS = 7;

    // Get historical daily data (last 90 days)
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const historical = await EnergiHarian.findAll({
      where: { userId, tanggal: { [Op.gte]: since.toISOString().slice(0, 10) } },
      order: [['tanggal', 'ASC']],
      attributes: ['tanggal', 'totalEnergi'],
    });

    if (historical.length < MIN_DAYS) {
      return {
        success: false,
        error: `Data tidak cukup. Dibutuhkan minimal ${MIN_DAYS} hari, saat ini: ${historical.length} hari.`,
      };
    }

    const tarif = await TarifListrik.findOne({ where: { userId, isActive: true } });
    const harga = tarif?.hargaPerKwh ?? 1444.70;

    const energiValues = historical.map((d) => d.totalEnergi);
    const seasonalFactors = getSeasonalFactors(historical);
    const std = stdDev(energiValues);
    const avgEnergy = energiValues.reduce((a, b) => a + b, 0) / energiValues.length;

    // Generate forecasts using Holt's method
    const forecasts = holtsSmoothing(energiValues, 0.4, 0.3, 7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Delete old predictions from today onwards for this user
    const todayStr = today.toISOString().slice(0, 10);
    await PrediksiEnergi.destroy({ where: { userId, tanggalPrediksi: { [Op.gte]: todayStr } } });

    const predictions = [];
    let maxPred = 0;

    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i + 1);
      const dateStr = forecastDate.toISOString().slice(0, 10);

      // Apply day-of-week seasonal adjustment
      const dow = forecastDate.getDay();
      const seasonal = seasonalFactors[dow] ?? 1;
      let pred = forecasts[i] * seasonal;
      pred = Math.max(0, pred);

      const lower = Math.max(0, pred - std * 0.8);
      const upper = pred + std * 0.8;
      const biaya = pred * harga;

      await PrediksiEnergi.create({
        tanggalPrediksi:  dateStr,
        userId:           userId,
        prediksiEnergi:   parseFloat(pred.toFixed(4)),
        prediksiBiaya:    parseFloat(biaya.toFixed(2)),
        confidenceLower:  parseFloat(lower.toFixed(4)),
        confidenceUpper:  parseFloat(upper.toFixed(4)),
        generatedAt:      new Date(),
      });

      if (pred > maxPred) maxPred = pred;

      predictions.push({
        tanggal_prediksi:  dateStr,
        prediksi_energi:   parseFloat(pred.toFixed(4)),
        prediksi_biaya:    parseFloat(biaya.toFixed(2)),
        confidence_lower:  parseFloat(lower.toFixed(4)),
        confidence_upper:  parseFloat(upper.toFixed(4)),
      });
    }

    // Check for spike alert
    await createPredictionSpikeAlert(maxPred, avgEnergy, userId);

    return { success: true, predictions, method: 'Holt Double Exponential Smoothing + Seasonal' };
  } catch (err) {
    console.error('Prediction error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { generatePredictions };
