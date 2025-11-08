import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import DetectionPanel from './pages/DetectionPanel/DetectionPanel';
import HistoryReports from './pages/HistoryReports/HistoryReports';
import SystemMonitor from './pages/SystemMonitor/SystemMonitor';
import AdminPanel from './pages/AdminPanel/AdminPanel';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Pay from './pages/Billing/Pay';
import Pro from './pages/Billing/Pro';
import Settings from './pages/Settings/Settings';
import NotFound from './pages/NotFound/NotFound';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/detection" element={<DetectionPanel />} />
        <Route path="/history" element={<HistoryReports />} />
        <Route path="/monitor" element={<SystemMonitor />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/pay" element={<Pay />} />
        <Route path="/pro" element={<Pro />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: (theme) => theme.palette.background.default }}>
      <AppContent />
    </Box>
  );
};

export default App; 