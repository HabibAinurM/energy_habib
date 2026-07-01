import React, { useState, useEffect } from 'react';
import { userAPI, settingsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Users, Plus, Shield, User, Settings, Edit2, Trash2 } from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'user', isActive: true });
  const [settingsForm, setSettingsForm] = useState({});
  const [editingUserId, setEditingUserId] = useState(null);

  const loadData = async () => {
    try {
      const [usersRes, settingsRes] = await Promise.all([
        userAPI.getAll(),
        settingsAPI.get(),
      ]);
      setUsers(usersRes.data);
      setSettings(settingsRes.data);
      setSettingsForm(settingsRes.data);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password; // Don't send empty password

      if (editingUserId) {
        await userAPI.update(editingUserId, payload);
        toast.success('User berhasil diupdate');
      } else {
        await userAPI.create(payload);
        toast.success('User berhasil dibuat');
      }
      setShowForm(false);
      setEditingUserId(null);
      setForm({ username: '', email: '', password: '', role: 'user', isActive: true });
      loadData();
    } catch (err) { 
      toast.error(err.response?.data?.error || (editingUserId ? 'Gagal mengupdate user' : 'Gagal membuat user')); 
    }
  };

  const handleEditClick = (user) => {
    setForm({ username: user.username, email: user.email || '', password: '', role: user.role, isActive: user.isActive !== false });
    setEditingUserId(user.id);
    setShowForm(true);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Yakin ingin menghapus user ini?')) return;
    try {
      await userAPI.delete(id);
      toast.success('User berhasil dihapus');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal menghapus user');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingUserId(null);
    setForm({ username: '', email: '', password: '', role: 'user', isActive: true });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await settingsAPI.update(settingsForm);
      toast.success('Pengaturan berhasil disimpan');
      setShowSettings(false);
      loadData();
    } catch { toast.error('Gagal menyimpan pengaturan'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Manajemen Sistem</h1>
          <p className="text-slate-400 text-sm mt-0.5">Kelola pengguna dan konfigurasi sistem</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl font-medium text-sm transition-all"
          >
            <Settings className="w-4 h-4" />
            Pengaturan Alert
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) handleCancelForm();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah User
          </button>
        </div>
      </div>

      {/* Alert Settings */}
      {showSettings && settings && (
        <div className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            Konfigurasi Ambang Batas Alert
          </h3>
          <form onSubmit={handleSaveSettings} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Tegangan Min (V)</label>
              <input
                type="number"
                value={settingsForm.voltage_min || ''}
                onChange={e => setSettingsForm({ ...settingsForm, voltage_min: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Tegangan Max (V)</label>
              <input
                type="number"
                value={settingsForm.voltage_max || ''}
                onChange={e => setSettingsForm({ ...settingsForm, voltage_max: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Arus Max (A)</label>
              <input
                type="number"
                value={settingsForm.current_max || ''}
                onChange={e => setSettingsForm({ ...settingsForm, current_max: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Warning Biaya (%)</label>
              <input
                type="number"
                value={settingsForm.cost_warning_percentage || ''}
                onChange={e => setSettingsForm({ ...settingsForm, cost_warning_percentage: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                min="0" max="100"
              />
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-end gap-3">
              <button type="button" onClick={() => setShowSettings(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Batal</button>
              <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium">Simpan Pengaturan</button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit User Form */}
      {showForm && (
        <div className="bg-slate-900/60 border border-blue-500/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-5">{editingUserId ? 'Edit User' : 'Tambah User Baru'}</h3>
          <form onSubmit={handleSubmitUser} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'username', label: 'Username', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'password', label: editingUserId ? 'Password Baru (Opsional)' : 'Password', type: 'password' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                  required={f.key === 'username' || (f.key === 'password' && !editingUserId)}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
              <select
                value={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-end gap-3 mt-2">
              <button type="button" onClick={handleCancelForm} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Batal</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium">{editingUserId ? 'Simpan Perubahan' : 'Buat User'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-white font-semibold text-sm">Daftar Pengguna</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/20 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                  user.role === 'admin' ? 'bg-gradient-to-br from-blue-600 to-blue-500' : 'bg-gradient-to-br from-slate-600 to-slate-500'
                }`}>
                  {user.username[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm">{user.username}</p>
                    {user.role === 'admin' && <Shield className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <p className="text-slate-500 text-xs">{user.email || 'Tidak ada email'}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${
                  user.role === 'admin' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-700/50 text-slate-400'
                }`}>
                  {user.role}
                </span>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${
                  user.isActive !== false ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {user.isActive !== false ? 'Aktif' : 'Nonaktif'}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => handleEditClick(user)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Edit User">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Hapus User">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
