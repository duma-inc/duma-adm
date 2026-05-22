import { api } from '@/lib/api';

export interface ResourceCategory {
  id: number | string;
  name: string;
}

export interface ResourceCategoryPayload {
  name: string;
}

export const resourceCategoryService = {
  getAll: async (): Promise<ResourceCategory[]> => {
    const response = await api.get('/resource-categories');
    return response.data;
  },
  getById: async (id: string): Promise<ResourceCategory> => {
    const response = await api.get(`/resource-categories/${id}`);
    return response.data;
  },
  create: async (data: ResourceCategoryPayload): Promise<ResourceCategory> => {
    const response = await api.post('/resource-categories', data);
    return response.data;
  },
  update: async (id: string, data: ResourceCategoryPayload): Promise<ResourceCategory> => {
    const response = await api.put(`/resource-categories/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/resource-categories/${id}`);
  },
};
