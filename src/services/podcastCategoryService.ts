import { api } from '@/lib/api';

export interface PodcastCategory {
  id: number | string;
  name: string;
}

export interface PodcastCategoryPayload {
  name: string;
}

export const podcastCategoryService = {
  getAll: async (): Promise<PodcastCategory[]> => {
    const response = await api.get('/podcasts/categories');
    return response.data;
  },
  getById: async (id: string): Promise<PodcastCategory> => {
    const response = await api.get(`/podcasts/categories/${id}`);
    return response.data;
  },
  create: async (data: PodcastCategoryPayload): Promise<PodcastCategory> => {
    const response = await api.post('/podcasts/categories', data);
    return response.data;
  },
  update: async (id: string, data: PodcastCategoryPayload): Promise<PodcastCategory> => {
    const response = await api.put(`/podcasts/categories/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/podcasts/categories/${id}`);
  },
};
