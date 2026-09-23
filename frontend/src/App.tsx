import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import API from './services/api';
import Login from './pages/Login';

// Route-level code splitting to dramatically minimize initial bundle size
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Rooms = lazy(() => import('./pages/Rooms'));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'));
const Reception = lazy(() => import('./pages/Reception'));
const Restaurant = lazy(() => import('./pages/Restaurant'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const Admin = lazy(() => import('./pages/Admin'));

const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-[#171717] flex flex-col items-center justify-center p-8">
    <div className="w-9 h-9 border-2 border-[#C49A32]/20 border-t-[#C49A32] rounded-full animate-spin mb-3"></div>
    <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Loading View...</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#C49A32]/30 border-t-[#C49A32] rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-[#8C827A] tracking-wider uppercase">Loading Imperium Hotel...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  
  return <Layout>{children}</Layout>;
};

const RootRedirect: React.FC = () => {
  const { logout } = useAuth();
  React.useEffect(() => {
    logout();
  }, [logout]);
  return <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  React.useEffect(() => {
    // 1. Proactive pre-warm ping on initial site visit to wake Render backend immediately
    API.get('health/').catch(() => {});

    // 2. Keep-alive ping every 10 minutes while app tab is open to prevent Render free-tier sleep
    const keepAliveInterval = setInterval(() => {
      API.get('health/').catch(() => {});
    }, 10 * 60 * 1000);

    return () => clearInterval(keepAliveInterval);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={<RootRedirect />} 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rooms" 
              element={
                <ProtectedRoute>
                  <Rooms />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/booking-confirmation" 
              element={
                <ProtectedRoute>
                  <BookingConfirmation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception" 
              element={
                <ProtectedRoute>
                  <Reception />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/restaurant" 
              element={
                <ProtectedRoute>
                  <Restaurant />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/kitchen" 
              element={
                <ProtectedRoute>
                  <Kitchen />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
};

export default App;
