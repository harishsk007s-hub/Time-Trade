import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  location: string | null;
  availability: any; // JSON structure for weekly availability
  timeBalance: number;
  skillOffers?: any[];
  skillWants?: any[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, bio?: string, location?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('timetrade_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const profile = await api.get<User>('/auth/profile');
      setUser(profile);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
      localStorage.setItem('timetrade_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string, bio?: string, location?: string) => {
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>('/auth/register', {
        name,
        email,
        password,
        bio,
        location,
      });
      localStorage.setItem('timetrade_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('timetrade_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const profile = await api.get<User>('/auth/profile');
      setUser(profile);
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await api.put<User>('/auth/profile', data);
      setUser(updatedUser);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
      }}
    >
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
