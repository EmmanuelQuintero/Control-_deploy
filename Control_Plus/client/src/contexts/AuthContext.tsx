import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: number; // id lógico en frontend
  id_usuario?: number; // mantener compatibilidad si backend lo envía
  nombre: string;
  apellido: string;
  email: string;
  edad?: number;
  sexo?: string;
  peso?: number;
  altura?: number;
  role: 'Usuario' | 'Admin';
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  const isAuthenticated = user !== null;
  const isAdmin = user?.role === 'Admin';

  // Restaurar sesión desde localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth:user');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Validación mínima
        if (parsed && parsed.email && parsed.role) {
          const normalized = {
            ...parsed,
            id: parsed.id ?? parsed.id_usuario,
          };
          setUser(normalized);
        }
      }
    } catch (err) {
      console.warn('No se pudo restaurar la sesión:', err);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          contraseña: password,
        }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        const normalized = { ...data.user, id: data.user.id ?? data.user.id_usuario };
        setUser(normalized);
        try {
          localStorage.setItem('auth:user', JSON.stringify(normalized));
        } catch {}
        console.log('Usuario logueado:', normalized);
        return true;
      } else {
        console.error('Error en login:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem('auth:user'); } catch {}
    console.log('Usuario deslogueado');
  };

  const updateUser = async (partial: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    const userId = user.id ?? user.id_usuario;
    if (userId == null) {
      console.error('No hay id de usuario para actualizar');
      return false;
    }
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const data = await response.json();
      if (data.success && data.user) {
        const normalized = { ...data.user, id: data.user.id ?? data.user.id_usuario };
        setUser(normalized);
        try { localStorage.setItem('auth:user', JSON.stringify(data.user)); } catch {}
        return true;
      }
      console.error('Error actualizando usuario', data.message);
      return false;
    } catch (e) {
      console.error('Error actualizando usuario', e);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      isAuthenticated,
      login,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}