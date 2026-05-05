import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import {
  Cpu, Plus, Settings2, Trash2, MapPin, Zap,
  Wifi, WifiOff, Edit3, X, Save, Home, Info,
  ToggleLeft, ToggleRight, AlertCircle
} from 'lucide-react';

/* ─── helpers ─── */
const STATUS_COLOR = {
  aktif:    'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  nonaktif: 'text-slate-400  bg-slate-700/30    border-slate-600/30',
  error:    'text-red-400    bg-red-400/10       border-red-500/30',
};

const DAYA_OPTIONS = [450, 900, 1300, 2200, 3500, 4400, 5500, 6600, 7700, 10600, 13200];

/* ─── mock API wrappers (ganti dengan endpoint nyata) ─── */
const deviceAPI = {
  getAll:  ()           => api.get('/devices'),
  create:  (data)       => api.post('/devices', data),
  update:  (id, data)   => api.put(`/devices/${id}`, data),
  delete:  (id)         => api.delete(`/devices/${id}`),
  toggle:  (id, status) => api.patch(`/devices/${id}/status`, { status }),
};

const EMPTY_FORM = {
  nama_perangkat: '',
  device_id: '',
  lokasi: '',
  titik_rumah: '',
  daya_terpasang: 1300,
  batas_kwh_harian: '',
  batas_kwh_bulanan: '',
  keterangan: '',
};

const DevicesPage = () => {
  const [devices, setDevices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  /* ─── load ─── */
  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await deviceAPI.getAll();
      setDevices(res.data || []);
    } catch {
      // Kalau endpoint belum ada, pakai dummy data supaya UI tetap kelihatan
      setDevices([
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { loadDevices(); }, []);

  /* ─── submit ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama_perangkat || !form.device_id || !form.titik_rumah) {
      toast.error('Nama perangkat, Device ID, dan titik rumah wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await deviceAPI.update(editId, form);
        toast.success('Perangkat berhasil diperbarui');
      } else {
        await deviceAPI.create(form);
        toast.success('Perangkat berhasil ditambahkan');
      }
      resetForm();
      loadDevices();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan, coba lagi');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (device) => {
    setForm({
      nama_perangkat:    device.nama_perangkat,
      device_id:         device.device_id,
      lokasi:            device.lokasi || '',
      titik_rumah:       device.titik_rumah || '',
      daya_terpasang:    device.daya_terpasang || 1300,
      batas_kwh_harian:  device.batas_kwh_harian || '',
      batas_kwh_bulanan: device.batas_kwh_bulanan || '',
      keterangan:        device.keterangan || '',
    });
    setEditId(device.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    try {
      await deviceAPI.delete(id);
      toast.success('Perangkat dihapus');
      setDeleteId(null);
      loadDevices();
    } catch {
      toast.error('Gagal menghapus perangkat');
    }
  };

  const handleToggle = async (device) => {
    const next = device.status === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      await deviceAPI.toggle(device.id, next);
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: next } : d));
      toast.success(`Perangkat ${next === 'aktif' ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch {
      toast.error('Gagal mengubah status perangkat');
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  /* ─── field helper ─── */
  const Field = ({ label, children, required, hint }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  );

  const inputCls = "w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm transition-colors";

  /* ─── render ─── */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-400" />
            Manajemen Perangkat
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Tambah dan konfigurasi perangkat IoT di rumah Anda</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/20"
        >
          {showForm && !editId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm && !editId ? 'Batal' : 'Tambah Perangkat'}
        </button>
      </div>

      {/* ── Form Tambah / Edit ── */}
      {showForm && (
        <div className="bg-slate-900/70 border border-blue-500/30 rounded-2xl overflow-hidden">
          {/* Form header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-400" />
              {editId ? 'Edit Perangkat' : 'Tambah Perangkat Baru'}
            </h3>
            <button onClick={resetForm} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* ── Identitas ── */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" /> Identitas Perangkat
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nama Perangkat" required>
                    <input
                      type="text"
                      value={form.nama_perangkat}
                      onChange={e => setForm({ ...form, nama_perangkat: e.target.value })}
                      placeholder="cth. Sensor Kamar Utama"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Device ID" required hint="ID unik dari hardware (ESP32, Arduino, dll)">
                    <input
                      type="text"
                      value={form.device_id}
                      onChange={e => setForm({ ...form, device_id: e.target.value })}
                      placeholder="cth. ESP32-001"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>

              {/* ── Lokasi ── */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Lokasi Pemasangan
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Lokasi / Ruangan">
                    <input
                      type="text"
                      value={form.lokasi}
                      onChange={e => setForm({ ...form, lokasi: e.target.value })}
                      placeholder="cth. Ruang Tamu, Kamar Tidur"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Titik Rumah" required hint="Panel listrik atau titik sambungan di rumah">
                    <input
                      type="text"
                      value={form.titik_rumah}
                      onChange={e => setForm({ ...form, titik_rumah: e.target.value })}
                      placeholder="cth. Panel Utama, MCB Lantai 2"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>

              {/* ── Konfigurasi Daya & kWh ── */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> Konfigurasi Daya & Batas kWh
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Daya Terpasang" hint="Sesuai daya PLN di rumah">
                    <select
                      value={form.daya_terpasang}
                      onChange={e => setForm({ ...form, daya_terpasang: Number(e.target.value) })}
                      className={inputCls}
                    >
                      {DAYA_OPTIONS.map(d => (
                        <option key={d} value={d}>{d.toLocaleString('id-ID')} VA</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Batas kWh Harian" hint="Notifikasi jika melebihi batas">
                    <div className="relative">
                      <input
                        type="number"
                        value={form.batas_kwh_harian}
                        onChange={e => setForm({ ...form, batas_kwh_harian: e.target.value })}
                        placeholder="cth. 10"
                        min="0"
                        step="0.1"
                        className={`${inputCls} pr-14`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">kWh</span>
                    </div>
                  </Field>
                  <Field label="Batas kWh Bulanan" hint="Notifikasi jika melebihi batas">
                    <div className="relative">
                      <input
                        type="number"
                        value={form.batas_kwh_bulanan}
                        onChange={e => setForm({ ...form, batas_kwh_bulanan: e.target.value })}
                        placeholder="cth. 300"
                        min="0"
                        step="0.1"
                        className={`${inputCls} pr-14`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">kWh</span>
                    </div>
                  </Field>
                </div>
              </div>

              {/* Keterangan */}
              <div className="md:col-span-2">
                <Field label="Keterangan (opsional)">
                  <textarea
                    value={form.keterangan}
                    onChange={e => setForm({ ...form, keterangan: e.target.value })}
                    placeholder="Catatan tambahan mengenai perangkat ini..."
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-800/60">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-all"
              >
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />
                }
                {editId ? 'Simpan Perubahan' : 'Tambah Perangkat'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Daftar Perangkat ── */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-2xl p-12 text-center">
          <Cpu className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Belum ada perangkat</p>
          <p className="text-slate-600 text-sm mt-1">Klik "Tambah Perangkat" untuk memulai</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {devices.map(device => (
            <div
              key={device.id}
              className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden hover:border-slate-600/60 transition-colors group"
            >
              {/* Card header */}
              <div className="flex items-start justify-between p-5 border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    device.status === 'aktif'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-800/60 border-slate-700/40'
                  }`}>
                    {device.status === 'aktif'
                      ? <Wifi className="w-5 h-5 text-emerald-400" />
                      : <WifiOff className="w-5 h-5 text-slate-500" />
                    }
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{device.nama_perangkat}</p>
                    <p className="text-slate-500 text-xs font-mono">{device.device_id}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${STATUS_COLOR[device.status] || STATUS_COLOR.nonaktif}`}>
                  {device.status || 'nonaktif'}
                </span>
              </div>

              {/* Card body */}
              <div className="p-5 space-y-3">
                {/* Lokasi & titik rumah */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/40 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Home className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-500 text-xs">Lokasi</span>
                    </div>
                    <p className="text-white text-sm font-medium truncate">{device.lokasi || '—'}</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-500 text-xs">Titik Rumah</span>
                    </div>
                    <p className="text-white text-sm font-medium truncate">{device.titik_rumah || '—'}</p>
                  </div>
                </div>

                {/* Daya & kWh */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/40 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-500 text-xs">Daya</span>
                    </div>
                    <p className="text-white text-sm font-semibold">
                      {device.daya_terpasang
                        ? `${Number(device.daya_terpasang).toLocaleString('id-ID')} VA`
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-800/40 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-slate-500 text-xs">kWh/hari</span>
                    </div>
                    <p className="text-white text-sm font-semibold">
                      {device.batas_kwh_harian ? `${device.batas_kwh_harian} kWh` : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-800/40 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-slate-500 text-xs">kWh/bulan</span>
                    </div>
                    <p className="text-white text-sm font-semibold">
                      {device.batas_kwh_bulanan ? `${device.batas_kwh_bulanan} kWh` : '—'}
                    </p>
                  </div>
                </div>

                {device.keterangan && (
                  <p className="text-slate-500 text-xs px-1">{device.keterangan}</p>
                )}
              </div>

              {/* Card footer — actions */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/50 bg-slate-900/30">
                <button
                  onClick={() => handleToggle(device)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {device.status === 'aktif'
                    ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                    : <ToggleLeft className="w-5 h-5 text-slate-500" />
                  }
                  {device.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(device)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {deleteId === device.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(device.id)}
                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all"
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(device.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DevicesPage;