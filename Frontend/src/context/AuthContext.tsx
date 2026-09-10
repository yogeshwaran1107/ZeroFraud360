import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, OfficerRole } from '../types';
import { api, tokenStorage, setOnUnauthorizedCallback } from '../api/client';


interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  role: OfficerRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(tokenStorage.getUser());
  const [token, setToken] = useState<string | null>(tokenStorage.get());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      tokenStorage.clear();
    } finally {
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    // Setup 401 callback
    setOnUnauthorizedCallback(() => {
      tokenStorage.clear();
      setUser(null);
      setToken(null);
    });

    const initAuth = async () => {
      const storedToken = tokenStorage.get();
      if (storedToken) {
        try {
          const profile = await api.auth.me();
          setUser(profile);
          setToken(storedToken);
          tokenStorage.setUser(profile);
        } catch {
          tokenStorage.clear();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(username, password);
      const userProfile: UserProfile = {
        username: res.username,
        role: res.role,
        enabled: true,
      };
      setUser(userProfile);
      setToken(res.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
