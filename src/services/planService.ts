import { api } from '@/lib/api';

export type PlanPeriod = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'FOREVER';

export interface PlanResource {
  texto: string;
  ativo: boolean;
}

export interface Plan {
  id: string;
  nome: string;
  preco: string;
  periodo: PlanPeriod;
  destaque: boolean;
  recursos: PlanResource[];
}

export const planService = {
  getAll: async (): Promise<Plan[]> => {
    const response = await api.get('/plans');
    return response.data;
  },
  getById: async (id: string): Promise<Plan> => {
    const response = await api.get(`/plans/${id}`);
    return response.data;
  },
  create: async (data: Omit<Plan, 'id'>): Promise<Plan> => {
    const response = await api.post('/plans', data);
    return response.data;
  },
  update: async (id: string, data: Partial<Plan>): Promise<Plan> => {
    const response = await api.put(`/plans/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/plans/${id}`);
  },
};
