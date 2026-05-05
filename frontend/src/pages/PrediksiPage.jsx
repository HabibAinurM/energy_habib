import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { prediksiAPI, energyAPI } from '../services/api';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { TrendingUp, Brain, RefreshCw, Calendar, DollarSign } from 'lucide-react';
import { formatRupiah, formatKWh } from '../utils/format';
import { toast } from 'react-toastify';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Helper: ambil nilai field, support camelCase & snake_case
const f = (obj, camel, snake) => obj[camel] ?? obj[snake] ?? null;

const PrediksiPage = () => {
  const [predictions, setPredictions] = useState([]);
  const [comparison, setComparison]   = useState({ actual: [], predictions: [] });
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);

  const loadData = async () => {
    try {
      const [predRes, compRes] = await Promise.all([
        prediksiAPI.getLatest(),
        prediksiAPI.getComparison(30),
      ]);
      setPredictions(predRes.data || []);
      setComparison(compRes.data || { actual: [], predictions: [] });
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data prediksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    toast.info('Memulai proses prediksi...');
    try {
      await prediksiAPI.generate();
      toast.success('Prediksi berhasil dibuat!');
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal membuat prediksi';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // ── Normalisasi field prediksi (camelCase dari Node.js) ──────────────────
  const normalPreds = predictions.map((d) => ({
    tanggal_prediksi:  f(d, 'tanggalPrediksi',  'tanggal_prediksi'),
    prediksi_energi:   f(d, 'prediksiEnergi',   'prediksi_energi')   ?? 0,
    prediksi_biaya:    f(d, 'prediksiBiaya',     'prediksi_biaya')    ?? 0,
    confidence_lower:  f(d, 'confidenceLower',   'confidence_lower')  ?? 0,
    confidence_upper:  f(d, 'confidenceUpper',   'confidence_upper')  ?? 0,
  })).filter((d) => d.tanggal_prediksi); // buang yang tanggalnya null

  // ── Normalisasi field comparison ─────────────────────────────────────────
  const normalActual = (comparison.actual || []).map((d) => ({
    tanggal:      f(d, 'tanggal', 'tanggal'),
    total_energi: f(d, 'totalEnergi', 'total_energi') ?? 0,
    total_biaya:  f(d, 'totalBiaya',  'total_biaya')  ?? 0,
  })).filter((d) => d.tanggal);

  const normalCompPreds = (comparison.predictions || []).map((d) => ({
    tanggal_prediksi: f(d, 'tanggalPrediksi', 'tanggal_prediksi'),
    prediksi_energi:  f(d, 'prediksiEnergi',  'prediksi_energi')  ?? 0,
    prediksi_biaya:   f(d, 'prediksiBiaya',   'prediksi_biaya')   ?? 0,
  })).filter((d) => d.tanggal_prediksi);

  // ── Format tanggal dengan aman ───────────────────────────────────────────
  const safeFormat = (dateStr, fmt, options = {}) => {
    try {
      if (!dateStr) return '';
      // Sequelize kadang kirim '2026-02-25T00:00:00.000Z', ambil 10 karakter pertama
      const clean = String(dateStr).slice(0, 10);
      return format(parseISO(clean), fmt, options);
    } catch {
      return String(dateStr).slice(0, 10);
    }
  };

  // ── Chart: prediksi 7 hari ───────────────────────────────────────────────
  const pred7Labels = normalPreds.map((d) =>
    safeFormat(d.tanggal_prediksi, 'EEE dd/MM', { locale: id })
  );

  const pred7Data = {
    labels: pred7Labels,
    datasets: [
      {
        label: 'Prediksi Energi (kWh)',
        data: normalPreds.map((d) => d.prediksi_energi),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderWidth: 2.5,
        pointRadius: 5,
        pointBackgroundColor: '#3b82f6',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Batas Atas',
        data: normalPreds.map((d) => d.confidence_upper),
        borderColor: 'rgba(59,130,246,0.3)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Batas Bawah',
        data: normalPreds.map((d) => d.confidence_lower),
        borderColor: 'rgba(59,130,246,0.3)',
        backgroundColor: 'rgba(59,130,246,0.05)',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.3,
        fill: '-1',
      },
    ],
  };

  // ── Chart: perbandingan aktual vs prediksi ───────────────────────────────
  const comparisonData = {
    labels: normalActual.map((d) => safeFormat(d.tanggal, 'dd/MM')),
    datasets: [
      {
        label: 'Aktual (kWh)',
        data: normalActual.map((d) => d.total_energi),
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34,211,238,0.1)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Prediksi (kWh)',
        data: normalCompPreds.map((d) => d.prediksi_energi),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 3,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11 }, padding: 16 } },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#94a3b8',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(59,130,246,0.3)',
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 10 } } },
    },
  };

  const totalPredEnergy = normalPreds.reduce((a, b) => a + b.prediksi_energi, 0);
  const totalPredBiaya  = normalPreds.reduce((a, b) => a + b.prediksi_biaya,  0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Prediksi Energi</h1>
          <p className="text-slate-400 text-sm mt-0.5">Prediksi konsumsi menggunakan Holt's Exponential Smoothing</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30 disabled:opacity-60"
        >
          {generating
            ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            : <Brain className="w-4 h-4" />}
          {generating ? 'Memproses...' : 'Generate Prediksi'}
        </button>
      </div>

      {/* Summary 7 hari */}
      {normalPreds.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <p className="text-slate-400 text-sm">Total Prediksi 7 Hari</p>
            </div>
            <p className="text-2xl font-bold text-white font-mono">
              {formatKWh(totalPredEnergy)} <span className="text-slate-400 text-base font-normal">kWh</span>
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <p className="text-slate-400 text-sm">Estimasi Biaya 7 Hari</p>
            </div>
            <p className="text-2xl font-bold text-white font-mono">{formatRupiah(totalPredBiaya)}</p>
          </div>
        </div>
      )}

      {/* Grafik prediksi 7 hari */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-blue-400" />
          <h3 className="text-white font-semibold">Prediksi 7 Hari ke Depan</h3>
        </div>
        <div className="h-60">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : normalPreds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Brain className="w-12 h-12 mb-3 opacity-30" />
              <p>Belum ada prediksi</p>
              <p className="text-sm text-slate-500 mt-1">
                Klik "Generate Prediksi" untuk memulai
              </p>
              <p className="text-xs text-slate-600 mt-1">
                (Butuh minimal 7 hari data — klik "Generate Test Data" di Dashboard dulu)
              </p>
            </div>
          ) : (
            <Line data={pred7Data} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Tabel prediksi */}
      {normalPreds.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-white font-semibold text-sm">Tabel Prediksi Harian</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/40">
                {['Tanggal','Prediksi Energi (kWh)','Batas Bawah','Batas Atas','Estimasi Biaya'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normalPreds.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-300">
                    {safeFormat(row.tanggal_prediksi, 'EEEE, dd MMMM yyyy', { locale: id })}
                  </td>
                  <td className="px-4 py-3 text-blue-400 font-mono font-semibold">{row.prediksi_energi.toFixed(4)}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{row.confidence_lower.toFixed(4)}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono">{row.confidence_upper.toFixed(4)}</td>
                  <td className="px-4 py-3 text-emerald-400 font-mono">{formatRupiah(row.prediksi_biaya)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grafik perbandingan */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Perbandingan Data Aktual vs Prediksi (30 Hari)</h3>
        <div className="h-64">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : normalActual.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p className="text-sm">Belum ada data historis untuk perbandingan</p>
              <p className="text-xs text-slate-500 mt-1">Generate test data terlebih dahulu di Dashboard</p>
            </div>
          ) : (
            <Line data={comparisonData} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PrediksiPage;