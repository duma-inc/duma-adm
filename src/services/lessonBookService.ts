import { api } from '@/lib/api';

export interface LessonBookChapter {
  id: string;
  order: number;
  title: string;
  summary: string;
  markdown: string;
}

export interface LessonBook {
  id: string;
  lessonId: string;
  title: string;
  subtitle?: string;
  pdfUrl: string;
  chapters: LessonBookChapter[];
}

export interface LessonBookPayload {
  id?: string;
  lessonId: string;
  title: string;
  subtitle?: string;
  pdfUrl: string;
}

export const lessonBookService = {
  getAll: async (): Promise<LessonBook[]> => {
    const response = await api.get('/lesson-books/admin');
    return response.data;
  },
  getById: async (id: string): Promise<LessonBook> => {
    const response = await api.get(`/lesson-books/admin/${id}`);
    return response.data;
  },
  create: async (data: LessonBookPayload): Promise<LessonBook> => {
    const response = await api.post('/lesson-books/admin', data);
    return response.data;
  },
  update: async (id: string, data: Partial<LessonBookPayload>): Promise<LessonBook> => {
    const response = await api.put(`/lesson-books/admin/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/lesson-books/admin/${id}`);
  },
};
