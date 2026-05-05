import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { energyAPI } from '../services/api';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { BarChart3, Download } from 'lucide-react';
import { formatRupiah, formatKWh } from '../utils/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend, Filler);

const RiwayatPage = () => {
  const [data, setData] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState('energy');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await energyAPI.getDailyRange(days);
        setData(res.data);
      } catch { }
      setLoading(false);
    };
    load();
  }, [days]);

  // Normalisasi field camelCase (Node.js) → snake_case
  const normalize = (d) => ({
    tanggal:      d.tanggal,
    total_energi: d.totalEnergi  ?? d.total_energi  ?? 0,
    total_biaya:  d.totalBiaya   ?? d.total_biaya   ?? 0,
    avg_daya:     d.avgDaya      ?? d.avg_daya      ?? 0,
    max_daya:     d.maxDaya      ?? d.max_daya      ?? 0,
    avg_tegangan: d.avgTegangan  ?? d.avg_tegangan  ?? 0,
    avg_arus:     d.avgArus      ?? d.avg_arus      ?? 0,
  });

  const safeParseISO = (str) => {
    try { return parseISO(String(str).slice(0, 10)); } catch { return new Date(); }
  };

  const sorted = [...data]
    .map(normalize)
    .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

  const labels = sorted.map(d => format(safeParseISO(d.tanggal), 'dd/MM'));
  const maxEnergi = Math.max(...sorted.map(x => x.total_energi), 1);

  const energyChart = {
    labels,
    datasets: [{
      label: 'Konsumsi Energi (kWh)',
      data: sorted.map(d => d.total_energi),
      backgroundColor: sorted.map(d => `rgba(59, 130, 246, ${0.4 + (d.total_energi / maxEnergi) * 0.5})`),
      borderColor: '#3b82f6',
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  const costChart = {
    labels,
    datasets: [{
      label: 'Biaya (Rp)',
      data: sorted.map(d => d.total_biaya),
      backgroundColor: 'rgba(16, 185, 129, 0.5)',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  const powerChart = {
    labels,
    datasets: [{
      label: 'Rata-rata Daya (W)',
      data: sorted.map(d => d.avg_daya),
      borderColor: '#a78bfa',
      backgroundColor: 'rgba(167, 139, 250, 0.1)',
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.4,
      fill: true,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#94a3b8',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 10 }, maxTicksLimit: 15 } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 10 } } }
    }
  };

  const totalEnergi = sorted.reduce((a, b) => a + b.total_energi, 0);
  const totalBiaya = sorted.reduce((a, b) => a + b.total_biaya, 0);
  const avgDaya = sorted.length > 0 ? sorted.reduce((a, b) => a + b.avg_daya, 0) / sorted.length : 0;

  const exportCSV = () => {
    const headers = ['Tanggal,Energi (kWh),Biaya (Rp),Avg Daya (W),Avg Tegangan (V),Avg Arus (A)'];
    const rows = sorted.map(d =>
      `${d.tanggal},${d.total_energi.toFixed(4)},${d.total_biaya.toFixed(2)},${d.avg_daya.toFixed(2)},${d.avg_tegangan.toFixed(2)},${d.avg_arus.toFixed(3)}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `energy_data_${days}days.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Riwayat Data</h1>
          <p className="text-slate-400 text-sm mt-0.5">Analisis konsumsi energi historis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800/60 rounded-xl p-1 gap-1">
            {[7, 14, 30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  days === d ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}H
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 text-center">
          <p className="text-slate-400 text-xs mb-1">Total Energi ({days} hari)</p>
          <p className="text-xl font-bold text-blue-400 font-mono">{formatKWh(totalEnergi)}</p>
          <p className="text-slate-500 text-xs">kWh</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 text-center">
          <p className="text-slate-400 text-xs mb-1">Total Biaya ({days} hari)</p>
          <p className="text-xl font-bold text-emerald-400 font-mono">{formatRupiah(totalBiaya)}</p>
          <p className="text-slate-500 text-xs">Rupiah</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 text-center">
          <p className="text-slate-400 text-xs mb-1">Rata-rata Daya</p>
          <p className="text-xl font-bold text-purple-400 font-mono">{avgDaya.toFixed(1)}</p>
          <p className="text-slate-500 text-xs">Watt</p>
        </div>
      </div>

      {/* Chart tabs */}
      <div className="flex gap-2">
        {[
          { value: 'energy', label: 'Energi' },
          { value: 'cost', label: 'Biaya' },
          { value: 'power', label: 'Daya' },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setViewType(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              viewType === t.value ? 'bg-blue-600 text-white' : 'bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main chart */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
        <div className="h-64">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewType === 'energy' ? (
            <Bar data={energyChart} options={chartOptions} />
          ) : viewType === 'cost' ? (
            <Bar data={costChart} options={chartOptions} />
          ) : (
            <Line data={powerChart} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-white font-semibold text-sm">Data Harian</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/40">
                {['Tanggal', 'Energi (kWh)', 'Biaya (Rp)', 'Avg Daya (W)', 'Max Daya (W)', 'Avg Tegangan (V)', 'Avg Arus (A)'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...sorted].reverse().map((row, idx) => (
                <tr key={idx} className="border-t border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-300">
                    {format(safeParseISO(row.tanggal), 'EEE, dd MMM yyyy', { locale: id })}
                  </td>
                  <td className="px-4 py-3 text-blue-400 font-mono">{row.total_energi.toFixed(4)}</td>
                  <td className="px-4 py-3 text-emerald-400 font-mono">{formatRupiah(row.total_biaya)}</td>
                  <td className="px-4 py-3 text-purple-400 font-mono">{row.avg_daya.toFixed(1)}</td>
                  <td className="px-4 py-3 text-amber-400 font-mono">{row.max_daya.toFixed(1)}</td>
                  <td className="px-4 py-3 text-cyan-400 font-mono">{row.avg_tegangan.toFixed(1)}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono">{row.avg_arus.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RiwayatPage;
