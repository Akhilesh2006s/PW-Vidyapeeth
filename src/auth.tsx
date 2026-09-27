import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, TOKEN_KEY } from './api';
import type { AuthPayload, User } from './types';

interface AuthValue {
  user: User | null;
  counsellor: AuthPayload['counsellor'];
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: { name: string; email: string; password: string; phone?: string; preferredLanguage: 'en' | 'te' }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [counsellor, setCounsellor] = useState<AuthPayload['counsellor']>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }
    authApi
      .me()
      .then((response) => {
        setUser(response.data.user);
        setCounsellor(response.data.counsellor);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      counsellor,
      ready,
      async login(email, password) {
        const response = await authApi.login(email, password);
        localStorage.setItem(TOKEN_KEY, response.data.token);
        setUser(response.data.user);
        setCounsellor(response.data.counsellor);
      },
      async register(body) {
        const response = await authApi.register(body);
        localStorage.setItem(TOKEN_KEY, response.data.token);
        setUser(response.data.user);
        setCounsellor(response.data.counsellor);
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setCounsellor(null);
      },
    }),
    [user, counsellor, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
