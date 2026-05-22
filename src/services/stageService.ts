import { api } from '@/lib/api';

export interface Stage {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription?: string;
  iconUrl?: string;
  color?: string;
  orderIndex?: number;
  isActive?: boolean;
  skillId?: number;
  skillName?: string;
}

export const stageService = {
  getAll: async (): Promise<Stage[]> => {
    const response = await api.get('/stages');
    return response.data;
  },
  getById: async (id: number): Promise<Stage> => {
    const response = await api.get(`/stages/${id}`);
    return response.data;
  },
  create: async (data: Partial<Stage>): Promise<Stage> => {
    const response = await api.post('/stages', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Stage>): Promise<Stage> => {
    const response = await api.put(`/stages/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/stages/${id}`);
  },
};
