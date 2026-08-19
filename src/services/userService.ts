import { api } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
}

export const userService = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },
  /** Usuario logado. O nome vem do backend, nao do token do Keycloak. */
  getMe: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },
};
