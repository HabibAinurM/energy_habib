import React, { useState, useEffect } from 'react';
import { dashboardAPI, devAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  Zap, Activity, TrendingUp, AlertTriangle,
  DollarSign, Battery, Wifi, WifiOff, RefreshCw, Gauge, Cpu
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import RealtimeCharts from '../components/RealtimeCharts';
import { formatRupiah, formatKWh } from '../utils/format';

// ─── STAT CARD ───────────────────────────────────────────
const StatCard = ({ title, value, unit, icon: Icon, color, trend, status }) => {
  const colorMap = {
    blue:   'from-blue-600 to-blue-500',
    cyan:   'from-cyan-600 to-cyan-500',
    green:  'from-emerald-600 to-emerald-500',
    amber:  'from-amber-600 to-amber-500',
    red:    'from-red-600 to-red-500',
    purple: 'from-purple-600 to-purple-500',
    indigo: 'from-indigo-600 to-indigo-500',
    rose:   'from-rose-600 to-rose-500',
  };

  const statusStyle = {
    normal:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    high:    'text-red-400    bg-red-500/10    border-red-500/20',
    low:     'text-amber-400  bg-amber-500/10  border-amber-500/20',
    warning: 'text-amber-400  bg-amber-500/10  border-amber-500/20',
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 hover:border-blue-500/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {status && (
          <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-lg border ${statusStyle[status] || 'text-slate-400 bg-slate-800 border-slate-700'}`}>
            {status}
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-400 text-sm mb-1">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-white font-mono">{value}</span>
          <span className="text-slate-400 text-sm">{unit}</span>
        </div>
        {trend && <p className="text-xs text-slate-500 mt-1">{trend}</p>}
      </div>
    </div>
  );
};

// ─── COST PROGRESS BAR ───────────────────────────────────
const CostProgressBar = ({ current, max, percentage }) => (
  <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-slate-400 text-sm">Biaya Bulan Ini</p>
          <p className="text-xl font-bold text-white font-mono">{formatRupiah(current)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-500">Batas</p>
        <p className="text-sm font-semibold text-slate-300">{formatRupiah(max)}</p>
      </div>
    </div>

    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ${
          percentage >= 100 ? 'bg-red-500' :
          percentage >= 80  ? 'bg-amber-500' :
          'bg-gradient-to-r from-blue-600 to-cyan-400'
        }`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
    <div className="flex justify-between mt-2">
      <span className="text-xs text-slate-500">{percentage.toFixed(1)}% terpakai</span>
      <span className={`text-xs font-medium ${
        percentage >= 100 ? 'text-red-400' :
        percentage >= 80  ? 'text-amber-400' : 'text-emerald-400'
      }`}>
        {percentage >= 100 ? '⚠ Melebihi Batas' :
         percentage >= 80  ? '⚠ Mendekati Batas' : '✓ Aman'}
      </span>
    </div>
  </div>
);

// ─── SECONDARY INFO CARD ─────────────────────────────────
const InfoGrid = ({ items }) => (
  <div className="grid grid-cols-2 gap-3">
    {items.map(({ label, value, subtext }) => (
      <div key={label} className="bg-slate-800/50 rounded-xl p-3 text-center">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-white font-bold font-mono">{value}</p>
        {subtext && <p className="text-slate-500 text-xs">{subtext}</p>}
      </div>
    ))}
  </div>
);

// ─── DASHBOARD PAGE ───────────────────────────────────────
const DashboardPage = () => {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const { isConnected, lastData } = useWebSocket();

  const fetchSummary = async () => {
    try {
      const response = await dashboardAPI.getSummary();
      setSummary(response.data);
    } catch {
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update realtime dari WebSocket — field disesuaikan dengan data sensor
  // WebSocket broadcastSensorUpdate mengirim: { tegangan, arus, daya, energi, ... }
  useEffect(() => {
    if (lastData && summary) {
      setSummary(prev => ({
        ...prev,
        // Nilai realtime dari sensor (langsung dari broadcastSensorUpdate)
        tegangan_terkini: lastData.tegangan,
        arus_terkini:     lastData.arus,
        daya_terkini:     lastData.daya,
        // Frekuensi & faktor daya jika dikirim oleh ESP32
        frekuensi_terkini:   lastData.frekuensi   ?? prev?.frekuensi_terkini,
        faktor_daya_terkini: lastData.faktorDaya  ?? prev?.faktor_daya_terkini,
      }));
    }
  }, [lastData]);

  const generateSampleData = async () => {
    try {
      toast.info('Generating sample data...');
      await devAPI.generateSampleData();
      toast.success('Sample data berhasil dibuat!');
      fetchSummary();
    } catch {
      toast.error('Gagal generate sample data');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400">Memuat dashboard...</p>
      </div>
    </div>
  );

  const d = summary || {};

  // ── Helper: status tegangan ──────────────────────────────
  // Nilai dari SystemSettings: voltageMin=190, voltageMax=250
  const vMin  = d.voltage_min ?? 190;
  const vMax  = d.voltage_max ?? 250;
  const vNow  = d.tegangan_terkini ?? 0;
  const statusTegangan =
    vNow === 0       ? null :
    vNow < vMin      ? 'low' :
    vNow > vMax      ? 'high' : 'normal';

  // ── Helper: status arus ──────────────────────────────────
  const iMax  = d.current_max ?? 20;
  const iNow  = d.arus_terkini ?? 0;
  const statusArus =
    iNow === 0           ? null :
    iNow > iMax          ? 'high' :
    iNow > iMax * 0.8    ? 'warning' : 'normal';

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Pemantauan energi listrik realtime</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            isConnected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-slate-600/30 bg-slate-800/40 text-slate-400'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <button
            onClick={generateSampleData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Generate Test Data
          </button>
        </div>
      </div>

      {/* ── Tariff Warning Banner ── */}
      {summary && !summary.has_tarif && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-amber-400 font-semibold text-sm">Tarif Listrik Belum Diatur</h3>
              <p className="text-amber-400/80 text-xs mt-0.5">Perhitungan biaya mungkin tidak akurat. Silakan atur tarif listrik Anda.</p>
            </div>
          </div>
          <Link
            to="/tarif"
            className="whitespace-nowrap px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold text-sm rounded-xl transition-colors"
          >
            Atur Tarif
          </Link>
        </div>
      )}

      {/* ── Stat Cards: data utama sensor ── */}
      {/* Semua nilai dari field database: tegangan, arus, daya, energi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tegangan"
          value={vNow.toFixed(1)}
          unit="V"
          icon={Zap}
          color="blue"
          status={statusTegangan}
          trend={`Batas: ${vMin}V – ${vMax}V`}
        />
        <StatCard
          title="Arus"
          value={iNow.toFixed(2)}
          unit="A"
          icon={Activity}
          color="cyan"
          status={statusArus}
          trend={`Batas maks: ${iMax} A`}
        />
        <StatCard
          title="Daya Aktif"
          value={(d.daya_terkini ?? 0).toFixed(0)}
          unit="W"
          icon={TrendingUp}
          color="purple"
          trend="Konsumsi saat ini"
        />
        <StatCard
          title="Energi Hari Ini"
          value={formatKWh(d.energi_hari_ini ?? 0)}
          unit="kWh"
          icon={Battery}
          color="green"
          trend={`≈ ${formatRupiah(d.biaya_hari_ini ?? 0)}`}
        />
      </div>

      {/* ── Baris kedua: frekuensi & faktor daya (dari ESP32) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Frekuensi"
          value={(d.frekuensi_terkini ?? 0).toFixed(1)}
          unit="Hz"
          icon={Gauge}
          color="indigo"
          trend="Standar PLN: 50 Hz"
        />
        <StatCard
          title="Faktor Daya"
          value={(d.faktor_daya_terkini ?? 0).toFixed(2)}
          unit=""
          icon={Cpu}
          color="rose"
          trend="Ideal: ≥ 0.85"
          status={
            (d.faktor_daya_terkini ?? 0) === 0    ? null :
            (d.faktor_daya_terkini ?? 0) >= 0.85  ? 'normal' : 'warning'
          }
        />
        <StatCard
          title="Peringatan Aktif"
          value={d.total_alert_unread ?? 0}
          unit="alert"
          icon={AlertTriangle}
          color="amber"
          status={d.total_alert_unread > 0 ? 'warning' : 'normal'}
          trend="Belum dibaca"
        />
        <StatCard
          title="Energi Bulan Ini"
          value={formatKWh(d.energi_bulan_ini ?? 0)}
          unit="kWh"
          icon={Battery}
          color="green"
          trend={`Tarif: ${formatRupiah(d.harga_per_kwh ?? 0)}/kWh`}
        />
      </div>

      {/* ── Biaya & Info ringkas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CostProgressBar
          current={d.biaya_bulan_ini ?? 0}
          max={d.batas_biaya_bulanan ?? 500000}
          percentage={d.persentase_biaya ?? 0}
        />

        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Statistik Cepat</p>
              <p className="text-xs text-slate-500">Data dari sensor & database</p>
            </div>
          </div>
          {/* 
            Semua key di bawah ini adalah field dari response dashboardAPI.getSummary()
            yang berasal dari data SensorData & EnergiHarian di database:
              - energi_bulan_ini  ← SUM(EnergiHarian.totalEnergi) bulan ini
              - biaya_hari_ini    ← EnergiHarian.totalBiaya hari ini
              - harga_per_kwh     ← TarifListrik.hargaPerKwh aktif
              - daya_terkini      ← SensorData terbaru (field: daya)
          */}
          <InfoGrid items={[
            {
              label:   'Daya Puncak Hari Ini',
              value:   `${(d.max_daya_hari_ini ?? 0).toFixed(0)} W`,
              subtext: 'dari EnergiHarian.maxDaya',
            },
            {
              label:   'Rata-rata Tegangan',
              value:   `${(d.avg_tegangan_hari_ini ?? 0).toFixed(1)} V`,
              subtext: 'dari EnergiHarian.avgTegangan',
            },
            {
              label:   'Rata-rata Arus',
              value:   `${(d.avg_arus_hari_ini ?? 0).toFixed(2)} A`,
              subtext: 'dari EnergiHarian.avgArus',
            },
            {
              label:   'Tarif per kWh',
              value:   formatRupiah(d.harga_per_kwh ?? 0),
              subtext: 'TarifListrik aktif',
            },
          ]} />
        </div>
      </div>

      {/* ── Realtime Charts ── */}
      <RealtimeCharts />
    </div>
  );
};

export default DashboardPage;