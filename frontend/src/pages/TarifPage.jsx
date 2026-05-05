import React, { useState, useEffect } from 'react';
import { tarifAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Settings, Plus, Check, Trash2, Edit2 } from 'lucide-react';
import { formatRupiah } from '../utils/format';
import { format } from 'date-fns';

const TarifPage = () => {
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    namaTarif: '',
    hargaPerKwh: '',
    batasBiayaBulanan: '',
  });

  const loadTarifs = async () => {
    try {
      const res = await tarifAPI.getAll();
      setTarifs(res.data.results || res.data);
    } catch {
      toast.error('Gagal memuat data tarif');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTarifs(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await tarifAPI.update(editItem.id, form);
        toast.success('Tarif berhasil diperbarui');
      } else {
        await tarifAPI.create(form);
        toast.success('Tarif baru berhasil dibuat dan diaktifkan');
      }
      setShowForm(false);
      setEditItem(null);
      setForm({ namaTarif: '', hargaPerKwh: '', batasBiayaBulanan: '' });
      loadTarifs();
    } catch {
      toast.error('Gagal menyimpan tarif');
    }
  };

  const handleEdit = (tarif) => {
    setEditItem(tarif);
    setForm({
      namaTarif: tarif.namaTarif,
      hargaPerKwh: tarif.hargaPerKwh,
      batasBiayaBulanan: tarif.batasBiayaBulanan || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus tarif ini?')) return;
    try {
      await tarifAPI.delete(id);
      toast.success('Tarif dihapus');
      loadTarifs();
    } catch {
      toast.error('Gagal menghapus tarif');
    }
  };

  const GOLONGAN = [
    { nama: 'R-1/TR 900VA', tarif: 1352 },
    { nama: 'R-1/TR 1300VA', tarif: 1444.70 },
    { nama: 'R-1/TR 2200VA', tarif: 1444.70 },
    { nama: 'R-2/TR 3500-5500VA', tarif: 1699.53 },
    { nama: 'R-3/TR ≥6600VA', tarif: 1699.53 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Manajemen Tarif</h1>
          <p className="text-slate-400 text-sm mt-0.5">Kelola tarif listrik dan batas biaya bulanan</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditItem(null); setForm({ namaTarif: '', hargaPerKwh: '', batasBiayaBulanan: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          Tambah Tarif
        </button>
      </div>

      {/* Referensi Golongan PLN */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4 text-sm">Referensi Tarif PLN (Januari 2024)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {GOLONGAN.map(g => (
            <button
              key={g.nama}
              onClick={() => {
                setForm({ namaTarif: g.nama, hargaPerKwh: g.tarif, batasBiayaBulanan: '' });
                setShowForm(true);
              }}
              className="bg-slate-800/60 hover:bg-blue-600/20 border border-slate-700/40 hover:border-blue-500/30 rounded-xl p-3 text-left transition-all"
            >
              <p className="text-slate-300 text-xs font-medium">{g.nama}</p>
              <p className="text-blue-400 font-bold font-mono text-sm mt-1">Rp {g.tarif.toFixed(2)}</p>
              <p className="text-slate-500 text-xs">per kWh</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900/60 border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-5">{editItem ? 'Edit Tarif' : 'Tambah Tarif Baru'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Tarif</label>
              <input
                type="text"
                value={form.namaTarif}
                onChange={e => setForm({ ...form, namaTarif: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Contoh: R-1/TR 1300VA"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Harga per kWh (Rp)</label>
              <input
                type="number"
                value={form.hargaPerKwh}
                onChange={e => setForm({ ...form, hargaPerKwh: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                placeholder="1444.70"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Batas Biaya Bulanan (Rp)</label>
              <input
                type="number"
                value={form.batasBiayaBulanan}
                onChange={e => setForm({ ...form, batasBiayaBulanan: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                placeholder="500000 (opsional)"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">
                Batal
              </button>
              <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all">
                <Check className="w-4 h-4" />
                {editItem ? 'Simpan Perubahan' : 'Simpan & Aktifkan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tarif table */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-white font-semibold text-sm">Daftar Tarif</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/40">
                {['Nama Tarif', 'Harga/kWh', 'Batas Bulanan', 'Status', 'Diperbarui', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tarifs.map(tarif => (
                <tr key={tarif.id} className={`border-t border-slate-800/40 hover:bg-slate-800/20 transition-colors ${tarif.isActive ? 'bg-blue-600/5' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {tarif.isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                      <span className={tarif.isActive ? 'text-white font-medium' : 'text-slate-400'}>{tarif.namaTarif}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-blue-400 font-mono">{formatRupiah(tarif.hargaPerKwh)}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono">
                    {tarif.batasBiayaBulanan ? formatRupiah(tarif.batasBiayaBulanan) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      tarif.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
                    }`}>
                      {tarif.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {tarif.updatedAt ? format(new Date(tarif.updatedAt), 'dd/MM/yyyy HH:mm') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(tarif)} className="p-1.5 rounded-lg hover:bg-blue-600/20 text-blue-400 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(tarif.id)} className="p-1.5 rounded-lg hover:bg-red-600/20 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TarifPage;
