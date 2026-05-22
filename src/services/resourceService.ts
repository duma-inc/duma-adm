import { api } from '@/lib/api';

export type ResourceMediaType = 'DOCUMENT' | 'VIDEO' | 'AUDIO';

export interface Resource {
  id: number | string;
  title: string;
  skillId?: number;
  stageId?: number;
  lessonId?: string;
  fileId?: number;
  url?: string;
  fileUrl?: string;
  downloadUrl?: string;
  mediaType: ResourceMediaType;
  resourceCategoryId?: number;
}

export interface ResourcePayload {
  title: string;
  skillId: number;
  stageId: number;
  lessonId: string;
  fileId?: number;
  url?: string;
  mediaType: ResourceMediaType;
  resourceCategoryId: number;
}

export const resourceService = {
  getAll: async (): Promise<Resource[]> => {
    const response = await api.get('/resources');
    return response.data;
  },
  getById: async (id: string): Promise<Resource> => {
    const response = await api.get(`/resources/${id}`);
    return response.data;
  },
  create: async (data: ResourcePayload): Promise<Resource> => {
    const response = await api.post('/resources', data);
    return response.data;
  },
  update: async (id: string, data: Partial<ResourcePayload>): Promise<Resource> => {
    const response = await api.put(`/resources/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/resources/${id}`);
  },
};
