import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../services/api';
import {
  UserCircle, Lock, Mail, User, Save, Eye, EyeOff,
  Shield, CheckCircle
} from 'lucide-react';

const AccountSettingsPage = () => {
  const { user, login } = useAuth();

  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    telegramChatId: user?.telegramChatId || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]         = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw]           = useState(false);

  /* ── handlers ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', profileForm);
      toast.success('Profil berhasil diperbarui');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }
    setSavingPw(true);
    try {
      await api.put('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password berhasil diubah');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setSavingPw(false);
    }
  };

  /* ── ui helpers ── */
  const InputField = ({ label, icon: Icon, type = 'text', value, onChange, placeholder, rightEl }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm transition-colors"
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
    </div>
  );

  const strengthScore = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const score = strengthScore(passwordForm.new_password);
  const strengthLabel = ['', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'][score];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500'][score];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-blue-400" />
          Pengaturan Akun
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Kelola informasi dan keamanan akun Anda</p>
      </div>

      {/* Kartu profil */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800/60 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold">{user?.username}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 text-xs capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
          <InputField
            label="Username"
            icon={User}
            value={profileForm.username}
            onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
            placeholder="Username Anda"
          />
          <InputField
            label="Email"
            icon={Mail}
            type="email"
            value={profileForm.email}
            onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
            placeholder="email@contoh.com"
          />
          <InputField
            label="Telegram Chat ID"
            icon={User}
            value={profileForm.telegramChatId}
            onChange={e => setProfileForm({ ...profileForm, telegramChatId: e.target.value })}
            placeholder="Contoh: 123456789"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-all"
            >
              {savingProfile
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Save className="w-4 h-4" />
              }
              Simpan Profil
            </button>
          </div>
        </form>
      </div>

      {/* Ganti password */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800/60">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            Ubah Password
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">Pastikan gunakan password yang kuat dan unik</p>
        </div>

        <form onSubmit={handleChangePassword} className="p-5 space-y-4">
          <InputField
            label="Password Saat Ini"
            icon={Lock}
            type={showCurrentPw ? 'text' : 'password'}
            value={passwordForm.current_password}
            onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
            placeholder="••••••••"
            rightEl={
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="text-slate-500 hover:text-slate-300 transition-colors">
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <InputField
            label="Password Baru"
            icon={Lock}
            type={showNewPw ? 'text' : 'password'}
            value={passwordForm.new_password}
            onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
            placeholder="Min. 6 karakter"
            rightEl={
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="text-slate-500 hover:text-slate-300 transition-colors">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          {/* Strength bar */}
          {passwordForm.new_password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= score ? strengthColor : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">Kekuatan: <span className="text-slate-300">{strengthLabel}</span></p>
            </div>
          )}

          <InputField
            label="Konfirmasi Password Baru"
            icon={Lock}
            type="password"
            value={passwordForm.confirm_password}
            onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
            placeholder="Ulangi password baru"
            rightEl={
              passwordForm.confirm_password && passwordForm.new_password === passwordForm.confirm_password
                ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                : null
            }
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPw}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-all"
            >
              {savingPw
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Lock className="w-4 h-4" />
              }
              Ubah Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountSettingsPage;