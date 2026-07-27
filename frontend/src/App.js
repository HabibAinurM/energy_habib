import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MonitoringPage from './pages/MonitoringPage';
import PrediksiPage from './pages/PrediksiPage';

import RiwayatPage from './pages/RiwayatPage';
import AlertsPage from './pages/AlertsPage';
import TarifPage from './pages/TarifPage';
import UsersPage from './pages/UsersPage';
import GlobalTarifPage from './pages/GlobalTarifPage';

import AccountSettingsPage from './pages/AccountSettingsPage';
import DevicesPage from './pages/DevicesPage';
import { Menu } from 'lucide-react';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-white">EnergyMonitor</span>
        </div>

        <div className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={
          <PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>
        } />
        <Route path="/monitoring" element={
          <PrivateRoute><Layout><MonitoringPage /></Layout></PrivateRoute>
        } />
        <Route path="/prediksi" element={
          <PrivateRoute><Layout><PrediksiPage /></Layout></PrivateRoute>
        } />
        <Route path="/riwayat" element={
          <PrivateRoute><Layout><RiwayatPage /></Layout></PrivateRoute>
        } />
        <Route path="/alerts" element={
          <PrivateRoute><Layout><AlertsPage /></Layout></PrivateRoute>
        } />
        <Route path="/tarif" element={
          <PrivateRoute><Layout><TarifPage /></Layout></PrivateRoute>
        } />
        <Route path="/users" element={
          <PrivateRoute adminOnly><Layout><UsersPage /></Layout></PrivateRoute>
        } />
        <Route path="/admin/tarif" element={
          <PrivateRoute adminOnly><Layout><GlobalTarifPage /></Layout></PrivateRoute>
        } />

        {/* ── Rute baru ── */}
        <Route path="/akun" element={
          <PrivateRoute><Layout><AccountSettingsPage /></Layout></PrivateRoute>
        } />
        <Route path="/perangkat" element={
          <PrivateRoute><Layout><DevicesPage /></Layout></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
    <ToastContainer
      position="bottom-right"
      autoClose={4000}
      theme="dark"
      toastStyle={{ background: '#0f172a', border: '1px solid rgba(59,130,246,0.3)', color: '#e2e8f0' }}
    />
  </AuthProvider>
);

export default App;