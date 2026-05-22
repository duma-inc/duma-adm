import { api } from '@/lib/api';

export interface Skill {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  categoryId?: number;
  category?: string;
  iconUrl: string;
}

export interface SkillCategory {
  id: number;
  name: string;
  description?: string;
}

export const skillService = {
  getCategories: async (): Promise<SkillCategory[]> => {
    const response = await api.get('/skills/categories');
    return response.data;
  },
  createCategory: async (data: Partial<SkillCategory>): Promise<SkillCategory> => {
    const response = await api.post('/skills/categories', data);
    return response.data;
  },
  updateCategory: async (id: number, data: Partial<SkillCategory>): Promise<SkillCategory> => {
    const response = await api.put(`/skills/categories/${id}`, data);
    return response.data;
  },
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/skills/categories/${id}`);
  },
  getAll: async (): Promise<Skill[]> => {
    const response = await api.get('/skills');
    return response.data;
  },
  create: async (data: Partial<Skill>): Promise<Skill> => {
    const response = await api.post('/skills', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Skill>): Promise<Skill> => {
    const response = await api.put(`/skills/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/skills/${id}`);
  },
};
