import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import BookingConfirmation from './pages/BookingConfirmation';
import Reception from './pages/Reception';
import Restaurant from './pages/Restaurant';
import Kitchen from './pages/Kitchen';
import Admin from './pages/Admin';

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
  return (
    <AuthProvider>
      <Router>
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
      </Router>
    </AuthProvider>
  );
};

export default App;
