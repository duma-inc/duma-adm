import { api } from '@/lib/api';
import { LessonBookChapter } from './lessonBookService';

export interface LessonBookChapterPayload {
  id?: string;
  order: number;
  title: string;
  summary: string;
  markdown: string;
}

export const lessonBookChapterService = {
  getAll: async (lessonBookId: string): Promise<LessonBookChapter[]> => {
    const response = await api.get(`/lesson-books/admin/${lessonBookId}/chapters`);
    return response.data;
  },
  create: async (lessonBookId: string, data: LessonBookChapterPayload): Promise<LessonBookChapter> => {
    const response = await api.post(`/lesson-books/admin/${lessonBookId}/chapters`, data);
    return response.data;
  },
  update: async (
    lessonBookId: string,
    chapterId: string,
    data: Partial<LessonBookChapterPayload>
  ): Promise<LessonBookChapter> => {
    const response = await api.put(`/lesson-books/admin/${lessonBookId}/chapters/${chapterId}`, data);
    return response.data;
  },
  delete: async (lessonBookId: string, chapterId: string): Promise<void> => {
    await api.delete(`/lesson-books/admin/${lessonBookId}/chapters/${chapterId}`);
  },
};
