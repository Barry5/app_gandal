'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'creator' | 'learner';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  creatorId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCreator: boolean;
  isLearner: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
  businessName?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getApiErrorMessage(payload: any, fallback: string) {
  if (payload?.details?.length) {
    return payload.details
      .map((item: { message?: string }) => item.message)
      .filter(Boolean)
      .join(' | ');
  }

  return payload?.error || fallback;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

function mapUser(data: any): User {
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    avatarUrl: data.avatarUrl || data.avatar_url,
    creatorId: data.creatorId || data.creator_id,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const isCreator = user?.role === 'creator';
  const isLearner = user?.role === 'learner';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const hydrateSession = async () => {
      const token = localStorage.getItem('savoir_token');
      const storedUser = localStorage.getItem('savoir_user');

      if (!token) {
        localStorage.removeItem('savoir_user');
        setIsLoading(false);
        return;
      }

      setToken(token);

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('savoir_user');
        }
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Invalid session');

        const payload = await response.json();
        const currentUser = mapUser(payload.user);
        setUser(currentUser);
        localStorage.setItem('savoir_user', JSON.stringify(currentUser));
        if (payload.token) {
localStorage.setItem('savoir_token', payload.token);
        setToken(payload.token);
      }
    } catch {
        localStorage.removeItem('savoir_user');
        localStorage.removeItem('savoir_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    hydrateSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Login failed');
      }

      const payload = await response.json();
      const currentUser = mapUser(payload.user);

      setUser(currentUser);
      localStorage.setItem('savoir_user', JSON.stringify(currentUser));
      localStorage.setItem('savoir_token', payload.token);
      setToken(payload.token);
      toast.success('Connexion reussie !');

      if (currentUser.role === 'creator' || currentUser.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/learn');
      }
    } catch {
      toast.error('Email ou mot de passe incorrect');
      throw new Error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(getApiErrorMessage(error, 'Inscription impossible'));
      }

      const payload = await response.json();
      const newUser = mapUser(payload.user);

      setUser(newUser);
      localStorage.setItem('savoir_user', JSON.stringify(newUser));
      localStorage.setItem('savoir_token', payload.token);
      setToken(payload.token);
      toast.success('Compte cree avec succes !');

      if (newUser.role === 'creator' || newUser.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/learn');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la creation du compte';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('savoir_user');
    localStorage.removeItem('savoir_token');
    toast.success('Deconnexion reussie');
    router.push('/');
  }, [router]);

  const switchRole = useCallback((_role: UserRole) => {
    toast.error('Le changement de role doit etre valide par le serveur.');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated,
      isCreator,
      isLearner,
      isAdmin,
      login,
      register,
      logout,
      switchRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
