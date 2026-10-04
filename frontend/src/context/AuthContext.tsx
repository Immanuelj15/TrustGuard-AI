import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAdmin: boolean;
  isInvestigator: boolean;
  isReviewer: boolean;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('trustguard_token');
    const storedUser = localStorage.getItem('trustguard_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
        // Verify with server in background
        apiClient.get('/auth/me')
          .then((res) => {
            setUser(res.data);
            localStorage.setItem('trustguard_user', JSON.stringify(res.data));
          })
          .catch(() => {
            logout();
          })
          .finally(() => setIsLoading(false));
      } catch (e) {
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('trustguard_token', newToken);
    localStorage.setItem('trustguard_user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('trustguard_token');
    localStorage.removeItem('trustguard_user');
  };

  const isAdmin = user?.role === 'admin';
  const isInvestigator = user?.role === 'investigator' || isAdmin;
  const isReviewer = user?.role === 'reviewer';
  const isDemo = user?.role === 'demo_user';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAdmin,
        isInvestigator,
        isReviewer,
        isDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
