// src/context/AuthProvider.tsx
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './authContext';
import type { User } from './types';

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Placeholder: aquí podrías intentar restaurar sesión desde un endpoint
    // o desde un storage seguro (si decide usarlo). Por ahora vacío.
  }, []);

  function login(u: User, token: string) {
    setUser(u);
    setAccessToken(token);
    // No guardes refresh token en localStorage desde frontend.
  }

  function logout() {
    setUser(null);
    setAccessToken(null);
    // Llamar backend para invalidar refresh token si corresponde.
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
