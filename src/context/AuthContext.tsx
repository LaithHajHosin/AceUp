/**
 * PrepPressure Authentication Context
 * Manages global user session, token storage, and logout synchronization.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (body: { username: string; email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (updated: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('preppressure.user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('preppressure.token');
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Sync logout event
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('preppressure:logout', handleLogout);
    return () => window.removeEventListener('preppressure:logout', handleLogout);
  }, []);

  // Validate existing token on load
  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const freshUser = await api.getMe();
          setUser(freshUser);
          localStorage.setItem('preppressure.user', JSON.stringify(freshUser));
        } catch {
          // Token expired or invalid
          setUser(null);
          setToken(null);
          localStorage.removeItem('preppressure.token');
          localStorage.removeItem('preppressure.user');
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await api.login({ usernameOrEmail, password });
    localStorage.setItem('preppressure.token', res.accessToken);
    localStorage.setItem('preppressure.user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (body: { username: string; email: string; password: string; displayName: string }) => {
    const res = await api.register(body);
    localStorage.setItem('preppressure.token', res.accessToken);
    localStorage.setItem('preppressure.user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('preppressure.token');
    localStorage.removeItem('preppressure.user');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('preppressure:logout'));
  };

  const updateCurrentUser = (updated: Partial<User>) => {
    if (!user) return;
    const fresh = { ...user, ...updated };
    setUser(fresh);
    localStorage.setItem('preppressure.user', JSON.stringify(fresh));
  };

  const refreshUser = async () => {
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      localStorage.setItem('preppressure.user', JSON.stringify(freshUser));
    } catch {}
  };

  const isAdmin = user?.role === 'admin' || user?.username === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        login,
        register,
        logout,
        updateCurrentUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
