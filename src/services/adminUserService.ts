import { api } from '@/lib/api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  role: 'STUDENT' | 'COLLABORATOR';
  temporaryPassword?: string;
  createdAt: string;
}

export const adminUserService = {
  getAll: async (): Promise<AdminUser[]> => {
    const response = await api.get('/users');
    return response.data;
  },
  create: async (data: Partial<AdminUser>): Promise<AdminUser> => {
    const response = await api.post('/users', data);
    return response.data;
  },
  update: async (id: string, data: Partial<AdminUser>): Promise<AdminUser> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
