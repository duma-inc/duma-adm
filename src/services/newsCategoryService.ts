import { api } from '@/lib/api';

export interface NewsCategory {
  id: number | string;
  name: string;
  sortOrder?: number;
}

export interface NewsCategoryPayload {
  name: string;
  sortOrder: number;
}

export const newsCategoryService = {
  getAll: async (): Promise<NewsCategory[]> => {
    const response = await api.get('/news/categories');
    return response.data;
  },
  getById: async (id: string): Promise<NewsCategory> => {
    const response = await api.get(`/news/categories/${id}`);
    return response.data;
  },
  create: async (data: NewsCategoryPayload): Promise<NewsCategory> => {
    const response = await api.post('/news/categories', data);
    return response.data;
  },
  update: async (id: string, data: NewsCategoryPayload): Promise<NewsCategory> => {
    const response = await api.put(`/news/categories/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/news/categories/${id}`);
  },
};
