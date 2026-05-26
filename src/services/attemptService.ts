import { api } from '@/lib/api';

export interface Attempt {
  id?: number | string;
  studentId?: string;
  lessonId?: string;
  exerciseId?: string;
  answerGiven?: string;
  isCorrect?: boolean;
  score?: number;
  timeSpentSeconds?: number;
  feedback?: string;
  correctionStatus?: 'PENDING' | 'CORRECTED' | 'NOT_APPLICABLE';
  createdAt?: string;
}

export interface AttemptPayload {
  studentId: string;
  lessonId: string;
  exerciseId: string;
  answerGiven: string;
  isCorrect?: boolean;
  score?: number;
  timeSpentSeconds?: number;
  feedback?: string;
  correctionStatus?: 'PENDING' | 'CORRECTED' | 'NOT_APPLICABLE';
}

export const attemptService = {
  getAll: async (): Promise<Attempt[]> => {
    const response = await api.get('/attempts');
    return response.data;
  },
  getById: async (id: string): Promise<Attempt> => {
    const response = await api.get(`/attempts/${id}`);
    return response.data;
  },
  getByStudentId: async (studentId: string): Promise<Attempt[]> => {
    const response = await api.get(`/attempts/student/${studentId}`);
    return response.data;
  },
  getByLessonId: async (lessonId: string): Promise<Attempt[]> => {
    const response = await api.get(`/attempts/lesson/${lessonId}`);
    return response.data;
  },
  getByExerciseId: async (exerciseId: string): Promise<Attempt[]> => {
    const response = await api.get(`/attempts/exercise/${exerciseId}`);
    return response.data;
  },
  getByStudentAndLesson: async (studentId: string, lessonId: string): Promise<Attempt[]> => {
    const response = await api.get('/attempts/by-student-and-lesson', {
      params: { studentId, lessonId },
    });
    return response.data;
  },
  create: async (data: AttemptPayload): Promise<Attempt> => {
    const response = await api.post('/attempts', data);
    return response.data;
  },
  update: async (id: string, data: Partial<AttemptPayload>): Promise<Attempt> => {
    const response = await api.put(`/attempts/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/attempts/${id}`);
  },
};
