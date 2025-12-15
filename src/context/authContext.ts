// src/context/authContext.ts
import { createContext } from 'react';
import type { User } from './types';

export type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);