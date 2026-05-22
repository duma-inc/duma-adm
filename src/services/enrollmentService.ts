import { api } from '@/lib/api';

export type EnrollmentStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'PENDING';
export type EnrollmentSource = 'WEB' | 'MOBILE' | 'API' | 'SELF_ENROLLED';
export type EnrollmentPace = 'CASUAL' | 'MODERATE' | 'AGGRESSIVE' | 'REGULAR';

export interface Enrollment {
  id: string | number;
  userId?: string;
  skillId?: number;
  stageId?: number;
  currentStageId?: number;
  planId?: number;
  status?: EnrollmentStatus;
  source?: EnrollmentSource;
  pace?: EnrollmentPace;
  currentLessonId?: string;
  progressPercentage?: number;
  enrolledAt?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  // campos que a API pode retornar
  userName?: string;
  planName?: string;
  skillName?: string;
  stageName?: string;
  currentStageName?: string;
  currentLessonTitle?: string;
}

export interface EnrollmentPayload {
  userId: string;
  skillId: number;
  currentStageId: number;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  pace: EnrollmentPace;
  currentLessonId: string;
  planId: number;
  enrolledAt?: string;
}

export const enrollmentService = {
  getAll: async (): Promise<Enrollment[]> => {
    const response = await api.get('/enrollments');
    return response.data;
  },
  getById: async (id: string): Promise<Enrollment> => {
    const response = await api.get(`/enrollments/${id}`);
    return response.data;
  },
  create: async (data: EnrollmentPayload): Promise<Enrollment> => {
    const response = await api.post('/enrollments', data);
    return response.data;
  },
  update: async (id: string, data: Partial<EnrollmentPayload>): Promise<Enrollment> => {
    const response = await api.put(`/enrollments/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/enrollments/${id}`);
  },
};
