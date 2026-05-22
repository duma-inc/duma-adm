import { api } from '@/lib/api';

export interface Module {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  isActive: boolean;
  stageId: number;
  skillId: number;
}

export const moduleService = {
  getAll: async (): Promise<Module[]> => {
    const response = await api.get('/modules');
    return response.data;
  },
  create: async (data: Partial<Module>): Promise<Module> => {
    const response = await api.post('/modules', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Module>): Promise<Module> => {
    const response = await api.put(`/modules/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/modules/${id}`);
  },
};
