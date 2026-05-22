import { api } from '@/lib/api';

export interface Teacher {
  id: number | string;
  userId: string;
  bio?: string;
  profilePictureUrl?: string;
  timezone?: string;
}

export const teacherService = {
  getAll: async (): Promise<Teacher[]> => {
    const response = await api.get('/teachers');
    return response.data;
  },
  getById: async (id: number | string): Promise<Teacher> => {
    const response = await api.get(`/teachers/${id}`);
    return response.data;
  },
  create: async (data: Partial<Teacher>): Promise<Teacher> => {
    const response = await api.post('/teachers', data);
    return response.data;
  },
  update: async (id: number | string, data: Partial<Teacher>): Promise<Teacher> => {
    const response = await api.put(`/teachers/${id}`, data);
    return response.data;
  },
  delete: async (id: number | string): Promise<void> => {
    await api.delete(`/teachers/${id}`);
  },
};
