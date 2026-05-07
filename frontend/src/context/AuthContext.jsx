import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (username, password) => {
    await api.login(username, password);
    await refresh();
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    setUser(null);
  };

  const isLider = user?.role === 'lider';
  const isAdmin = user?.role === 'lider' || user?.role === 'sub_lider';

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, refresh, isLider, isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
