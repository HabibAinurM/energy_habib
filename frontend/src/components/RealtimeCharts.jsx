import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import { sensorAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { format } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const MAX_POINTS = 60;

const chartDefaults = {
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
      padding: 10,
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: '#475569', maxTicksLimit: 8, font: { size: 10 } },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: '#475569', font: { size: 10 } },
    }
  },
  animation: { duration: 200 },
};

const createDataset = (label, data, color, fillColor) => ({
  label,
  data,
  borderColor: color,
  backgroundColor: fillColor,
  borderWidth: 2,
  pointRadius: 0,
  tension: 0.4,
  fill: true,
});

const SmallChart = ({ title, unit, data, labels, color }) => {
  const chartData = {
    labels,
    datasets: [createDataset(title, data, color, `${color}22`)],
  };

  const latestValue = data[data.length - 1] || 0;

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-white font-mono">{latestValue.toFixed(2)}</span>
          <span className="text-slate-500 text-xs">{unit}</span>
        </div>
      </div>
      <div className="h-20">
        <Line data={chartData} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: false } } }} />
      </div>
    </div>
  );
};

const RealtimeCharts = () => {
  const { lastData } = useWebSocket();
  const [chartState, setChartState] = useState({
    labels: [],
    tegangan: [],
    arus: [],
    daya: [],
  });
  const [loading, setLoading] = useState(true);

  // Load initial history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await sensorAPI.getHistory(2); // Last 2 hours
        const data = response.data.data || [];
        
        // Take last MAX_POINTS
        const slice = data.slice(-MAX_POINTS);
        setChartState({
          labels: slice.map(d => format(new Date(d.timestamp), 'HH:mm:ss')),
          tegangan: slice.map(d => d.tegangan),
          arus: slice.map(d => d.arus),
          daya: slice.map(d => d.daya),
        });
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  // Append new data from WebSocket
  useEffect(() => {
    if (!lastData) return;
    setChartState(prev => {
      const newLabel = format(new Date(lastData.timestamp), 'HH:mm:ss');
      const append = (arr, val) => [...arr.slice(-(MAX_POINTS-1)), val];
      return {
        labels: append(prev.labels, newLabel),
        tegangan: append(prev.tegangan, lastData.tegangan),
        arus: append(prev.arus, lastData.arus),
        daya: append(prev.daya, lastData.daya),
      };
    });
  }, [lastData]);

  const powerChartData = {
    labels: chartState.labels,
    datasets: [createDataset('Daya (W)', chartState.daya, '#3b82f6', 'rgba(59, 130, 246, 0.1)')],
  };

  if (loading) return (
    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
      Memuat grafik...
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Main Power Chart */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Grafik Daya Realtime</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs text-slate-400">Live</span>
          </div>
        </div>
        <div className="h-52">
          <Line data={powerChartData} options={chartDefaults} />
        </div>
      </div>

      {/* Small Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SmallChart
          title="Tegangan (V)"
          unit="V"
          data={chartState.tegangan}
          labels={chartState.labels}
          color="#22d3ee"
        />
        <SmallChart
          title="Arus (A)"
          unit="A"
          data={chartState.arus}
          labels={chartState.labels}
          color="#a78bfa"
        />
      </div>
    </div>
  );
};

export default RealtimeCharts;