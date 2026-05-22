import { api } from '@/lib/api';

export interface CashCategory {
  id: number;
  name: string;
  description?: string;
}

export interface CreateCashCategoryPayload {
  name: string;
  description?: string;
}

export const cashCategoryService = {
  getAll: async (): Promise<CashCategory[]> => {
    const response = await api.get('/cash-categories');
    return response.data;
  },
  create: async (data: CreateCashCategoryPayload): Promise<CashCategory> => {
    const response = await api.post('/cash-categories', data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/cash-categories/${id}`);
  },
};
