import { api } from '@/lib/api';

export interface VideoCategory {
  id: number | string;
  name: string;
  sortOrder?: number;
}

export interface VideoCategoryPayload {
  name: string;
  sortOrder: number;
}

export const videoCategoryService = {
  getAll: async (): Promise<VideoCategory[]> => {
    const response = await api.get('/videos/categories');
    return response.data;
  },
  getById: async (id: string): Promise<VideoCategory> => {
    const response = await api.get(`/videos/categories/${id}`);
    return response.data;
  },
  create: async (data: VideoCategoryPayload): Promise<VideoCategory> => {
    const response = await api.post('/videos/categories', data);
    return response.data;
  },
  update: async (id: string, data: VideoCategoryPayload): Promise<VideoCategory> => {
    const response = await api.put(`/videos/categories/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/videos/categories/${id}`);
  },
};
