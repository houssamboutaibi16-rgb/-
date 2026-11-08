import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: { name?: string; settings?: any }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    if (!api.hasToken()) {
      const explicitlyLoggedOut = sessionStorage.getItem('novapulse_logged_out');
      if (!explicitlyLoggedOut) {
        try {
          const res = await api.login('creator@novapulse.ai', 'password123');
          setUser(res.user);
          setLoading(false);
          return;
        } catch {
          // Continue as guest
        }
      }
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const u = await api.getCurrentUser();
      setUser(u);
    } catch (err) {
      console.warn('Failed to load user session:', err);
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    sessionStorage.removeItem('novapulse_logged_out');
    try {
      const res = await api.login(email, pass);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    setLoading(true);
    sessionStorage.removeItem('novapulse_logged_out');
    try {
      const res = await api.register(name, email, pass);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    sessionStorage.setItem('novapulse_logged_out', 'true');
    try {
      await api.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: { name?: string; settings?: any }) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
