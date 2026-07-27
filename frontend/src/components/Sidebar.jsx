import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap, LayoutDashboard, BarChart3, TrendingUp,
  Bell, Settings, Users, LogOut, Activity,
  Cpu, UserCircle, ChevronDown, ChevronRight
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/monitoring', icon: Activity,        label: 'Monitoring Realtime' },
  { path: '/prediksi',  icon: TrendingUp,       label: 'Prediksi Energi' },
  { path: '/riwayat',   icon: BarChart3,        label: 'Riwayat Data' },
  { path: '/alerts',    icon: Bell,             label: 'Peringatan', badge: true },
];

const adminItems = [
  { path: '/users', icon: Users,    label: 'Manajemen User' },
  { path: '/admin/tarif', icon: Settings, label: 'Manajemen Tarif Global' },
];

const settingItems = [
  { path: '/akun',      icon: UserCircle, label: 'Pengaturan Akun' },
  { path: '/perangkat', icon: Cpu,        label: 'Perangkat' },
  { path: '/tarif',     icon: Settings,   label: 'Manajemen Tarif' },
];

const Sidebar = ({ unreadAlerts = 0, isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ item }) => (
    <NavLink
      to={item.path}
      onClick={() => onClose && onClose()}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
          isActive
            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
        }`
      }
    >
      <item.icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium text-sm">{item.label}</span>
      {item.badge && unreadAlerts > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadAlerts > 9 ? '9+' : unreadAlerts}
        </span>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/50
        flex flex-col z-30 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
      `}>

        {/* Logo */}
        <div className="p-5 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-lg leading-none">EnergyMon</h1>
              <p className="text-slate-500 text-xs mt-0.5">IoT Monitoring System</p>
            </div>
          </div>
        </div>

        {/* Navigasi utama */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-3">
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-2">Menu</p>
            {navItems.map((item) => <NavItem key={item.path} item={item} />)}
          </div>

          {isAdmin && (
            <div className="mt-4">
              <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-2">Admin</p>
              {adminItems.map((item) => <NavItem key={item.path} item={item} />)}
            </div>
          )}
        </nav>

        {/* Bagian bawah: Pengaturan + Logout */}
        <div className="p-4 border-t border-slate-800/50 space-y-1">

          {/* Pengaturan collapsible */}
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">Pengaturan</span>
            </div>
            {settingsOpen
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
            }
          </button>

          {settingsOpen && (
            <div className="space-y-1 pl-3">
              {settingItems.map((item) => <NavItem key={item.path} item={item} />)}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Keluar</span>
          </button>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;