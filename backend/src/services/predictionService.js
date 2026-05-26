/**
 * Prediction Service (LSTM via Python Bridge)
 * Menggunakan model Deep Learning LSTM berformat .h5 hasil dari Google Colab.
 */

const { SensorData, Device, PrediksiEnergi, TarifListrik } = require('../models');
const { Op } = require('sequelize');
const { createPredictionSpikeAlert } = require('./alertService');
const path = require('path');
const { spawn } = require('child_process');

// Fungsi helper untuk menjalankan Python script dengan membawa input matriks 2D
function runPythonPrediction(rawInputMatrix, horizon, timeStep, numFeatures) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'scripts', 'predict.py');
    const modelPath = path.join(__dirname, '..', 'ml_model', 'model_lstm_energi (1).h5'); // Sesuaikan nama file model kamu

    // Gunakan 'python' di Windows, 'python3' di Linux/Mac
    const pythonCmd = /^win/.test(process.platform) ? 'python' : 'python3';
    const pyProcess = spawn(pythonCmd, [pythonScript]);
    let outputData = '';
    let errorData = '';

    pyProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python Error:', errorData);
        return reject(new Error('Python script exited with code ' + code + ': ' + errorData));
      }
      try {
        const result = JSON.parse(outputData);
        if (!result.success) {
          return reject(new Error(result.error));
        }
        resolve(result.forecasts); // Mengembalikan array hasil prediksi
      } catch (e) {
        console.error('Failed to parse Python output:', outputData);
        reject(new Error('Invalid JSON from Python script'));
      }
    });

    // Payload dikirim dalam bentuk JSON via stdin ke Python
    const payload = JSON.stringify({
      input: rawInputMatrix,      // Matriks 2D mentah berukuran 10x7
      horizon: horizon,           // Nilai interval masa depan (misal: 48)
      time_step: timeStep,        // Berilai 10 sesuai model LSTM
      num_features: numFeatures,  // Bernilai 7 sesuai fitur sensor
      model_path: modelPath
    });

    pyProcess.stdin.write(payload);
    pyProcess.stdin.end();
  });
}

// ─── Main prediction function ─────────────────────────────
async function generatePredictions(userId) {
  try {
    const HARI_KEDEPAN = 7;       // Memprediksi 7 hari ke depan
    const INTERVAL_PER_HARI = 96; // 1 hari = 96 interval (data per 15 menit)
    const HORIZON = HARI_KEDEPAN * INTERVAL_PER_HARI; // Total interval ke depan
    const TIME_STEP = 10;         // Membutuhkan 10 interval terakhir sesuai spesifikasi model LSTM

    // 1. Dapatkan device milik user
    const devices = await Device.findAll({ where: { userId } });
    if (devices.length === 0) return { success: false, error: 'User tidak memiliki device' };
    const deviceIds = devices.map(d => d.id);

    // 2. Ambil 10 data sensor terakhir
    const historical = await SensorData.findAll({
      where: { deviceId: { [Op.in]: deviceIds } },
      order: [['timestamp', 'DESC']],
      limit: TIME_STEP,
      attributes: [
        'tegangan',
        'arus',
        'daya',
        'energi',
        'frekuensi',
        'faktorDaya'
      ]
    });

    // Cek kecukupan minimal data
    if (historical.length < TIME_STEP) {
      return {
        success: false,
        error: `Data sensor tidak cukup untuk LSTM. Dibutuhkan minimal ${TIME_STEP} interval data, saat ini baru ada: ${historical.length}.`
      };
    }

    // Urutkan data dari yang terlama ke terbaru (ASC) agar runut waktu
    historical.reverse();

    // Mapping records database menjadi array di dalam array (Matriks 2D: 10 x 7)
    // Urutan fitur saat training: [tegangan, arus, daya_avg, daya_max, energi, frek, pf]
    const rawInputMatrix = historical.map(d => [
      parseFloat(d.tegangan || 0),
      parseFloat(d.arus || 0),
      parseFloat(d.daya || 0),
      parseFloat(d.daya || 0),     // Menggunakan daya karena tabel tidak memiliki kolom max_daya
      parseFloat(d.energi || 0),
      parseFloat(d.frekuensi || 0),
      parseFloat(d.faktorDaya || 0)
    ]);

    // Ambil rata-rata daya saat ini untuk dijadikan base pembanding historis harian
    const avgDayaSaatIni = rawInputMatrix.reduce((sum, row) => sum + row[2], 0) / TIME_STEP;
    const estimasiKwhNormalHarian = avgDayaSaatIni * 24; // (Rata-rata Watt * 24 Jam) / 1000 jika satuannya watt mentah

    // Ambil data tarif dasar listrik user
    const tarif = await TarifListrik.findOne({ where: { userId, isActive: true } });
    const harga = tarif?.hargaPerKwh ?? 1444.70;

    // Panggil skrip Python (Proses normalisasi & reshape ditangani oleh predict.py)
    const NUM_FEATURES = 7;
    const forecasts = await runPythonPrediction(rawInputMatrix, HORIZON, TIME_STEP, NUM_FEATURES);

    // 3. Simpan Hasil Prediksi ke Database
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    // Hapus data prediksi hari ini dan hari-hari setelahnya yang usang sebelum menulis yang baru
    await PrediksiEnergi.destroy({ where: { userId, tanggalPrediksi: { [Op.gte]: todayStr } } });

    const predictions = [];
    let maxPred = 0;

    // --- LOOP UNTUK MENYIMPAN PREDIKSI PER HARI ---
    for (let i = 0; i < HARI_KEDEPAN; i++) {
      // Ambil potongan interval (96 data) khusus untuk hari ke-i
      const dailyForecasts = forecasts.slice(i * INTERVAL_PER_HARI, (i + 1) * INTERVAL_PER_HARI);

      // Akumulasi total prediksi energi hari tersebut
      const totalPrediksiEnergi = dailyForecasts.reduce((a, b) => a + b, 0);
      const biaya = totalPrediksiEnergi * harga;

      // ─── PERBAIKAN LOGIKA CONFIDENCE INTERVAL (Batas Bawah & Atas) ───
      // Menggunakan 10% dari total ramalan hari itu agar proporsional dan tidak menghasilkan angka 0 terus menerus
      const deviasiHarian = totalPrediksiEnergi * 0.10; 

      // Format tanggal (Hari ini + i + 1)
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + (i + 1));
      const tglString = forecastDate.toISOString().slice(0, 10);

      // ─── LOGIKA REKOMENDASI TINDAKAN CERDAS (LOGIC BRIDGE) ───
      let rekomendasiTindakan = "Penggunaan listrik diprediksi stabil dan aman. Pertahankan pola penggunaan perangkat elektronik Anda.";
      let statusSistem = "AMAN";

      // Jika hasil prediksi melonjak 20% lebih tinggi dari kondisi pemakaian normal harian saat ini
      if (totalPrediksiEnergi > estimasiKwhNormalHarian * 1.2) {
        statusSistem = "BAHAYA_BOROS";
        rekomendasiTindakan = `Peringatan! Prediksi konsumsi listrik pada ${tglString} melonjak cukup tinggi. Disarankan untuk membatasi pemakaian peralatan elektronik berdaya besar seperti AC, pemanas air, atau mesin cuci pada jam-jam sibuk.`;
      } 
      // Jika estimasi pengeluaran biaya per hari dirasa sudah melewati ambang batas tertentu (misal Rp 30.000)
      else if (biaya > 30000) {
        statusSistem = "PERINGATAN_BIAYA";
        rekomendasiTindakan = `Estimasi biaya operasional listrik pada ${tglString} cukup tinggi (Rp ${biaya.toLocaleString('id-ID', { maximumFractionDigits: 0 })}). Pertimbangkan untuk mengoptimalkan penggunaan suhu AC di 24-25°C dan mencabut adaptor yang tidak digunakan untuk menghemat pengeluaran.`;
      }

      // Tulis rekap prediksi ke database untuk tanggal tersebut
      await PrediksiEnergi.create({
        tanggalPrediksi: tglString,
        userId: userId,
        prediksiEnergi: parseFloat(totalPrediksiEnergi.toFixed(4)),
        prediksiBiaya: parseFloat(biaya.toFixed(2)),
        confidenceLower: parseFloat(Math.max(0, totalPrediksiEnergi - deviasiHarian).toFixed(4)),
        confidenceUpper: parseFloat((totalPrediksiEnergi + deviasiHarian).toFixed(4)),
        generatedAt: new Date(),
        // Catatan: Jika tabel PrediksiEnergi kamu sudah memiliki kolom 'rekomendasi' dan 'status', 
        // kamu bisa membuka komentar di bawah ini untuk menyimpannya ke database:
        // rekomendasi: rekomendasiTindakan,
        // status: statusSistem
      });

      predictions.push({
        tanggal_prediksi: tglString,
        prediksi_energi: parseFloat(totalPrediksiEnergi.toFixed(4)),
        prediksi_biaya: parseFloat(biaya.toFixed(2)),
        status: statusSistem,
        rekomendasi: rekomendasiTindakan
      });

      // Ambil nilai tertinggi dari hasil ramalan untuk memicu alert jika terjadi lonjakan mendadak
      const localMax = Math.max(...dailyForecasts);
      if (localMax > maxPred) maxPred = localMax;
    }

    // Check for spike alert
    await createPredictionSpikeAlert(maxPred, avgDayaSaatIni * 2, userId);

    return { success: true, predictions, method: 'Deep Learning (LSTM .h5 Python Bridge)' };
  } catch (err) {
    console.error('Prediction error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { generatePredictions };