import axios from 'axios';
import { api } from '@/lib/api';

export type ReportedIssueStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface ReportedIssue {
  id: string;
  exerciseId: string;
  comment: string;
  reportedBy: string;
  status: ReportedIssueStatus;
  createdAt: string;
}

async function tryRequestWithFallbacks<T>(requests: Array<() => Promise<T>>): Promise<T> {
  let lastError: unknown;

  for (const request of requests) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (!axios.isAxiosError(error) || (status !== 404 && status !== 405)) {
        throw error;
      }
    }
  }

  throw lastError;
}

export const reportedIssueService = {
  getAll: async (): Promise<ReportedIssue[]> => {
    const response = await api.get('/exercises/reportedIssue');
    return response.data;
  },
  getByExercise: async (exerciseId: string): Promise<ReportedIssue[]> => {
    const response = await api.get(`/exercises/${exerciseId}/reportedIssue`);
    return response.data;
  },
  create: async (exerciseId: string, data: { comment: string }): Promise<ReportedIssue> => {
    const response = await api.post(`/exercises/${exerciseId}/reportedIssue`, data);
    return response.data;
  },
  update: async (
    exerciseId: string,
    issueId: string,
    data: Partial<Pick<ReportedIssue, 'comment' | 'status'>>
  ): Promise<ReportedIssue> => {
    const response = await api.patch(
      `/exercises/${exerciseId}/reportedIssue/${issueId}/status`,
      data
    );
    return response.data;
  },
  delete: async (exerciseId: string, issueId: string): Promise<void> => {
    await tryRequestWithFallbacks([
      () => api.delete(`/exercises/${exerciseId}/reportedIssue/${issueId}`),
      () => api.delete(`/exercises/${exerciseId}/reportedIssue/${issueId}/delete`),
      () => api.delete(`/reportedIssue/${issueId}`),
      () => api.delete(`/reportedIssue/${issueId}/delete`),
    ]);
  },
};
