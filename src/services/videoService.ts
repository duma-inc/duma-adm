import { api } from '@/lib/api';

export interface VideoItem {
  id: string;
  title: string;
  categoryId?: number | string;
  category?: string;
  embedUrl: string;
  thumbnailUrl?: string;
  durationLabel: string;
  description?: string;
}

export interface VideoItemPayload {
  id?: string;
  title: string;
  categoryId: number;
  embedUrl: string;
  thumbnailUrl?: string;
  durationLabel: string;
  description?: string;
}

export const videoService = {
  getAll: async (): Promise<VideoItem[]> => {
    const response = await api.get('/videos/items');
    return response.data;
  },
  getById: async (id: string): Promise<VideoItem> => {
    const response = await api.get(`/videos/items/${id}`);
    return response.data;
  },
  create: async (data: VideoItemPayload): Promise<VideoItem> => {
    const response = await api.post('/videos/items', data);
    return response.data;
  },
  update: async (id: string, data: Partial<VideoItemPayload>): Promise<VideoItem> => {
    const response = await api.put(`/videos/items/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/videos/items/${id}`);
  },
};
