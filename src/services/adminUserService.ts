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
    const response = await api.get('/admin/users');
    return response.data;
  },
  create: async (data: Partial<AdminUser>): Promise<AdminUser> => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },
  update: async (id: string, data: Partial<AdminUser>): Promise<AdminUser> => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },
  /**
   * Sorteia uma senha nova e a grava no Keycloak. Devolvida uma única vez — a senha não fica
   * guardada em lugar nenhum, então é o único caminho de volta para quem esqueceu a sua.
   */
  resetPassword: async (id: string): Promise<AdminUser> => {
    const response = await api.post(`/admin/users/${id}/reset-password`);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },
};
