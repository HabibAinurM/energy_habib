import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Check, Trash2, Edit2 } from 'lucide-react';
import { formatRupiah } from '../utils/format';

const GlobalTarifPage = () => {
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    namaGolongan: '',
    tarifPerKwh: '',
  });

  const loadTarifs = async () => {
    try {
      const res = await api.get('/master-tarif');
      setTarifs(res.data);
    } catch {
      toast.error('Gagal memuat data tarif global');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTarifs(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/master-tarif/${editItem.id}`, form);
        toast.success('Tarif global diperbarui');
      } else {
        await api.post('/master-tarif', form);
        toast.success('Tarif global baru ditambahkan');
      }
      setShowForm(false);
      setEditItem(null);
      setForm({ namaGolongan: '', tarifPerKwh: '' });
      loadTarifs();
    } catch {
      toast.error('Gagal menyimpan tarif global');
    }
  };

  const handleEdit = (tarif) => {
    setEditItem(tarif);
    setForm({
      namaGolongan: tarif.namaGolongan,
      tarifPerKwh: tarif.tarifPerKwh,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus tarif referensi ini?')) return;
    try {
      await api.delete(`/master-tarif/${id}`);
      toast.success('Tarif dihapus');
      loadTarifs();
    } catch {
      toast.error('Gagal menghapus tarif');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Manajemen Tarif Global</h1>
          <p className="text-slate-400 text-sm mt-0.5">Kelola referensi tarif PLN (Januari 2024)</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditItem(null); setForm({ namaGolongan: '', tarifPerKwh: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          Tambah Referensi
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900/60 border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-5">{editItem ? 'Edit Referensi' : 'Tambah Referensi Baru'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Golongan</label>
              <input
                type="text"
                value={form.namaGolongan}
                onChange={e => setForm({ ...form, namaGolongan: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Contoh: R-1/TR 1300VA"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Tarif per kWh (Rp)</label>
              <input
                type="number"
                value={form.tarifPerKwh}
                onChange={e => setForm({ ...form, tarifPerKwh: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                placeholder="1444.70"
                step="0.01"
                required
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">
                Batal
              </button>
              <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all">
                <Check className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-white font-semibold text-sm">Daftar Referensi Tarif</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Nama Golongan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Tarif/kWh</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tarifs.map(tarif => (
                <tr key={tarif.id} className="border-t border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{tarif.id}</td>
                  <td className="px-4 py-3 text-white font-medium">{tarif.namaGolongan}</td>
                  <td className="px-4 py-3 text-blue-400 font-mono">{formatRupiah(tarif.tarifPerKwh)}</td>
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
              {tarifs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                    Belum ada data referensi tarif global.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default GlobalTarifPage;
