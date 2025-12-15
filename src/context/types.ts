// src/context/types.ts
export type Role = 'PARENT' | 'PSYCHOLOGIST' | 'ADMIN';

export type User = {
  id: string;
  name: string;
  role: Role;
};