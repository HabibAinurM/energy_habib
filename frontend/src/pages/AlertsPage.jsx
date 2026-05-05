import React, { useState, useEffect } from 'react';
import { alertAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Bell, CheckCheck, AlertTriangle, Zap, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const ALERT_ICONS = {
  voltage_low: Zap,
  voltage_high: Zap,
  current_high: Activity,
  cost_limit: DollarSign,
  prediction_spike: TrendingUp,
};

const SEVERITY_STYLES = {
  info: 'border-blue-500/30 bg-blue-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  critical: 'border-red-500/30 bg-red-500/5',
};

const SEVERITY_ICON_STYLES = {
  info: 'bg-blue-500/20 text-blue-400',
  warning: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-red-500/20 text-red-400',
};

const SEVERITY_BADGE = {
  info: 'bg-blue-500/15 text-blue-400',
  warning: 'bg-amber-500/15 text-amber-400',
  critical: 'bg-red-500/15 text-red-400',
};

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadAlerts = async () => {
    try {
      const res = await alertAPI.getAll();
      setAlerts(res.data.results || res.data);
    } catch {
      toast.error('Gagal memuat peringatan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  const handleMarkAllRead = async () => {
    try {
      await alertAPI.markAllRead();
      toast.success('Semua peringatan ditandai dibaca');
      loadAlerts();
    } catch {
      toast.error('Gagal memperbarui peringatan');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await alertAPI.markRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch {
      toast.error('Gagal memperbarui peringatan');
    }
  };

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.is_read;
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning') return a.severity === 'warning';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Peringatan Dini</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} peringatan belum dibaca` : 'Semua peringatan sudah dibaca'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Semua', value: 'all' },
          { label: `Belum Dibaca (${unreadCount})`, value: 'unread' },
          { label: 'Kritis', value: 'critical' },
          { label: 'Peringatan', value: 'warning' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.value
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <Bell className="w-12 h-12 mb-3 opacity-20" />
          <p>Tidak ada peringatan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => {
            const Icon = ALERT_ICONS[alert.alert_type] || AlertTriangle;
            return (
              <div
                key={alert.id}
                className={`border rounded-2xl p-4 transition-all ${
                  !alert.is_read ? SEVERITY_STYLES[alert.severity] : 'border-slate-800/40 bg-slate-900/30 opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    !alert.is_read ? SEVERITY_ICON_STYLES[alert.severity] : 'bg-slate-700/30 text-slate-500'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                        !alert.is_read ? SEVERITY_BADGE[alert.severity] : 'bg-slate-700/30 text-slate-500'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">{alert.alert_type_display}</span>
                      {!alert.is_read && (
                        <span className="ml-auto flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span className="text-xs text-blue-400">Baru</span>
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mb-2 ${!alert.is_read ? 'text-white' : 'text-slate-400'}`}>{alert.message}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        {format(new Date(alert.timestamp), 'EEEE, dd MMMM yyyy - HH:mm:ss', { locale: id })}
                      </p>
                      {!alert.is_read && (
                        <button
                          onClick={() => handleMarkRead(alert.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
