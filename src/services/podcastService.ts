import { api } from '@/lib/api';

export interface PodcastEpisode {
  id: number | string;
  title: string;
  categoryId?: number | string;
  categoryName?: string;
  skillId: number;
  coverImageUrl?: string;
  audioUrl?: string;
  durationLabel?: string;
  transcript?: string;
  description: string;
  fileId?: number;
}

export interface PodcastEpisodePayload {
  title: string;
  categoryId: number;
  skillId: number;
  description: string;
  durationLabel?: string;
  transcript?: string;
  coverImageUrl?: string;
  audioUrl?: string;
  fileId?: number;
}

export const podcastService = {
  getAll: async (): Promise<PodcastEpisode[]> => {
    const response = await api.get('/podcasts/episodes');
    return response.data;
  },
  getById: async (id: string): Promise<PodcastEpisode> => {
    const response = await api.get(`/podcasts/episodes/${id}`);
    return response.data;
  },
  create: async (data: PodcastEpisodePayload): Promise<PodcastEpisode> => {
    const response = await api.post('/podcasts/episodes', data);
    return response.data;
  },
  update: async (id: string, data: Partial<PodcastEpisodePayload>): Promise<PodcastEpisode> => {
    const response = await api.put(`/podcasts/episodes/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/podcasts/episodes/${id}`);
  },
};
