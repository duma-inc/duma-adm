import { api } from '@/lib/api';

export interface NewsArticle {
  id: string;
  categoryId?: number | string;
  category?: string;
  headline: string;
  summary: string;
  highlightedArticle: boolean;
  source: string;
  publishedAt: string;
  content: string;
}

export interface NewsArticlePayload {
  id?: string;
  categoryId: number;
  headline: string;
  summary: string;
  highlightedArticle: boolean;
  source: string;
  publishedAt: string;
  content: string;
}

export const newsService = {
  getAll: async (): Promise<NewsArticle[]> => {
    const response = await api.get('/news/articles');
    return response.data;
  },
  getById: async (id: string): Promise<NewsArticle> => {
    const response = await api.get(`/news/articles/${id}`);
    return response.data;
  },
  create: async (data: NewsArticlePayload): Promise<NewsArticle> => {
    const response = await api.post('/news/articles', data);
    return response.data;
  },
  update: async (id: string, data: Partial<NewsArticlePayload>): Promise<NewsArticle> => {
    const response = await api.put(`/news/articles/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/news/articles/${id}`);
  },
};
