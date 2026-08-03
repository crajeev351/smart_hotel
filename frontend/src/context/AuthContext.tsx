import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../services/api';

interface User {
  id: string;
  username: string;
  role: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: any) => Promise<{ otp_required?: boolean; email?: string; message?: string } | void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userResponse = await API.get('users/me/');
          setUser(userResponse.data);
          localStorage.setItem('user', JSON.stringify(userResponse.data));
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: any): Promise<{ otp_required?: boolean; email?: string; message?: string } | void> => {
    const response = await API.post('token/', credentials);
    if (response.data && response.data.otp_required) {
      return response.data;
    }
    const { access, refresh, user: userData } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    if (userData) {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      try {
        const userResponse = await API.get('users/me/');
        setUser(userResponse.data);
        localStorage.setItem('user', JSON.stringify(userResponse.data));
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
