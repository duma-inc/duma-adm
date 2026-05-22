import { api } from '@/lib/api';

export interface Lesson {
  id: string;
  title: string;
  content?: string;
  orderIndex: number;
  isActive: boolean;
  moduleId?: string;
  stageId?: string;
  skillId?: string;
  videoUrl?: string;
  durationInMinutes?: number;
}

export const lessonService = {
  getAll: async (): Promise<Lesson[]> => {
    const response = await api.get('/lessons');
    return response.data;
  },
  create: async (data: Partial<Lesson>): Promise<Lesson> => {
    const response = await api.post('/lessons', data);
    return response.data;
  },
  update: async (id: string, data: Partial<Lesson>): Promise<Lesson> => {
    const response = await api.put(`/lessons/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/lessons/${id}`);
  },
};
