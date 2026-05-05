import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { sensorAPI } from '../services/api';
import { format } from 'date-fns';
import { Activity, Zap, TrendingUp, Clock } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend, Filler);

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
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#475569', font: { size: 10 }, maxTicksLimit: 12 }
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#475569', font: { size: 10 } }
    }
  }
};

const TimeRangeSelector = ({ value, onChange }) => {
  const ranges = [
    { label: '1J', value: 1 },
    { label: '6J', value: 6 },
    { label: '12J', value: 12 },
    { label: '24J', value: 24 },
    { label: '48J', value: 48 },
  ];
  
  return (
    <div className="flex items-center bg-slate-800/60 rounded-xl p-1 gap-1">
      {ranges.map(r => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === r.value
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
};

const MonitoringPage = () => {
  const [history, setHistory] = useState([]);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [histRes, hourlyRes] = await Promise.all([
          sensorAPI.getHistory(hours),
          sensorAPI.getHourlyStats(hours),
        ]);
        setHistory(histRes.data.data || []);
        setHourlyStats(hourlyRes.data || []);
      } catch (err) {
        console.error('Failed to load monitoring data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [hours]);

  const labels = history.map(d => format(new Date(d.timestamp), 'HH:mm'));
  const hourlyLabels = hourlyStats.map(d => format(new Date(d.hour), 'dd/MM HH:mm'));

  const tegananData = {
    labels,
    datasets: [{
      data: history.map(d => d.tegangan),
      borderColor: '#22d3ee',
      backgroundColor: 'rgba(34, 211, 238, 0.05)',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
    }]
  };

  const arusData = {
    labels,
    datasets: [{
      data: history.map(d => d.arus),
      borderColor: '#a78bfa',
      backgroundColor: 'rgba(167, 139, 250, 0.05)',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
    }]
  };

  const dayaData = {
    labels,
    datasets: [{
      data: history.map(d => d.daya),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
    }]
  };

  const hourlyEnergyData = {
    labels: hourlyLabels,
    datasets: [{
      label: 'Total Energi (kWh)',
      data: hourlyStats.map(d => d.total_energi),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 4,
    }]
  };

  const ChartCard = ({ title, icon: Icon, color, data, unit, yLabel }) => (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <span className="ml-auto text-xs text-slate-500">{unit}</span>
      </div>
      <div className="h-44">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Line data={data} options={{
            ...chartOptions,
            scales: {
              ...chartOptions.scales,
              y: { ...chartOptions.scales.y, title: { display: true, text: yLabel, color: '#475569', font: { size: 9 } } }
            }
          }} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Monitoring Realtime</h1>
          <p className="text-slate-400 text-sm mt-0.5">Grafik detail parameter listrik</p>
        </div>
        <TimeRangeSelector value={hours} onChange={setHours} />
      </div>

      {/* Voltage, Current, Power charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tegangan" icon={Zap} color="text-cyan-400" data={tegananData} unit="Volt" yLabel="V" />
        <ChartCard title="Arus" icon={Activity} color="text-purple-400" data={arusData} unit="Ampere" yLabel="A" />
      </div>
      
      <ChartCard title="Daya Aktif" icon={TrendingUp} color="text-blue-400" data={dayaData} unit="Watt" yLabel="W" />
      
      {/* Hourly energy consumption */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">Konsumsi Energi per Jam</h3>
          <span className="ml-auto text-xs text-slate-500">kWh</span>
        </div>
        <div className="h-52">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Bar data={hourlyEnergyData} options={{
              ...chartOptions,
              plugins: { ...chartOptions.plugins, legend: { display: false } }
            }} />
          )}
        </div>
      </div>

      {/* Last readings table */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-white font-semibold text-sm">Data Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/40">
                {['Waktu', 'Tegangan (V)', 'Arus (A)', 'Daya (W)', 'Energi (kWh)'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.slice(-10).reverse().map((row, idx) => (
                <tr key={idx} className="border-t border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                    {format(new Date(row.timestamp), 'dd/MM HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3 text-cyan-400 font-mono">{row.tegangan.toFixed(1)}</td>
                  <td className="px-4 py-3 text-purple-400 font-mono">{row.arus.toFixed(3)}</td>
                  <td className="px-4 py-3 text-blue-400 font-mono">{row.daya.toFixed(1)}</td>
                  <td className="px-4 py-3 text-emerald-400 font-mono">{row.energi.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
