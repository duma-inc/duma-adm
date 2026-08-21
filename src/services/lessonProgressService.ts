import { api } from '@/lib/api';

export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LessonProgress {
  id: number;
  studentId: string;
  lessonId: string;
  status: LessonProgressStatus;
  progressPercent?: number;
  watchedMinutes?: number;
  startedAt?: string;
  lastAccessAt?: string;
  completedAt?: string;
}

export const lessonProgressService = {
  getByStudent: async (studentId: string): Promise<LessonProgress[]> => {
    const response = await api.get(`/lesson-progress/student/${studentId}`);
    return response.data;
  },

  /**
   * Marca (ou reabre) a conclusão de uma lição. Idempotente: o backend faz upsert em
   * (studentId, lessonId), então chamar duas vezes não duplica nem reescreve o completedAt.
   */
  setCompletion: async (
    studentId: string,
    lessonId: string,
    completed: boolean,
  ): Promise<LessonProgress> => {
    const response = await api.put('/lesson-progress/completion', { studentId, lessonId, completed });
    return response.data;
  },
};
