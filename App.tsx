import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import LandingPage from './components/pages/LandingPage';
import LoginPage from './components/pages/LoginPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardPage from './components/dashboard/DashboardPage';
import SettingsPage from './components/dashboard/SettingsPage';
import MenuPage from './components/dashboard/MenuPage';
import OrdersPage from './components/dashboard/OrdersPage';
import AuthWrapper from './components/ui/AuthWrapper';
import PublicMenuPage from './components/pages/PublicMenuPage';
import ReviewsPage from './components/dashboard/ReviewsPage';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/menu/:slug" element={<PublicMenuPage />} />
          <Route 
            path="/dashboard"
            element={
              <AuthWrapper>
                <DashboardLayout />
              </AuthWrapper>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;