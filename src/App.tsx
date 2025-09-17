import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import ServiceOrders from '@/pages/ServiceOrders';
import OrdersList from '@/pages/OrdersList';
import Clients from '@/pages/Clients';
import ClientForm from '@/pages/ClientForm';
import ClientEdit from '@/pages/ClientEdit';
import ConfigLogo from '@/pages/ConfigLogo';
import ConfigEmail from '@/pages/ConfigEmail';
import ConfigFirebase from '@/pages/ConfigFirebase';
import NotFound from '@/pages/NotFound';
import { InstallPrompt } from '@/components/InstallPrompt';
import { PWAStatus } from '@/components/PWAStatus';
import { OfflineSync } from '@/components/OfflineSync';

function App() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <div className="fixed top-4 right-4 z-40">
          <PWAStatus />
        </div>
        
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/service-orders" element={<ServiceOrders />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/orders-list" element={<OrdersList />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/new" element={<ClientForm />} />
          <Route path="/clients/edit/:id" element={<ClientEdit />} />
          <Route path="/config/logo" element={<ConfigLogo />} />
          <Route path="/config-logo" element={<ConfigLogo />} />
          <Route path="/config/email" element={<ConfigEmail />} />
          <Route path="/config-email" element={<ConfigEmail />} />
          <Route path="/config/firebase" element={<ConfigFirebase />} />
          <Route path="/config-firebase" element={<ConfigFirebase />} />
          <Route path="/offline-sync" element={<OfflineSync />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        <Toaster />
        
        {showInstallPrompt && (
          <InstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
        )}
      </div>
    </Router>
  );
}

export default App;