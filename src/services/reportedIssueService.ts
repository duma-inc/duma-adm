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
};
