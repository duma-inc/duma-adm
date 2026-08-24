import { api } from '@/lib/api';

export interface ClassFlashcard {
  id: string;
  lessonId: string;
  stageId?: number | null;
  skillId?: number | null;
  /** Frente em texto. Ausente quando o card é só imagem. */
  frontText?: string | null;
  frontImageFileId?: number | null;
  frontImageUrl?: string | null;
  /** Verso opcional. */
  backText?: string | null;
  example?: string;
  phonetic?: string;
  category?: string;
  orderIndex: number;
  isActive: boolean;
}

export interface ClassFlashcardPayload {
  lessonId: string;
  stageId?: number | null;
  skillId?: number | null;
  frontText?: string | null;
  frontImageFileId?: number | null;
  backText?: string | null;
  example?: string;
  phonetic?: string;
  category?: string;
  orderIndex?: number;
  isActive?: boolean;
}

/**
 * Deck de vocabulário da lição, apresentado pelo professor no duma-toolkit.
 * Não confundir com /flashcards, que é o baralho pessoal do aluno com repetição espaçada.
 */
export const classFlashcardService = {
  /** Catálogo inteiro — a tela de listagem carrega tudo e filtra no cliente. */
  getAll: async (): Promise<ClassFlashcard[]> => {
    const response = await api.get('/class-flashcards/admin');
    return response.data;
  },
  getByLesson: async (lessonId: string): Promise<ClassFlashcard[]> => {
    const response = await api.get(`/class-flashcards/admin?lessonId=${lessonId}`);
    return response.data;
  },
  create: async (data: ClassFlashcardPayload): Promise<ClassFlashcard> => {
    const response = await api.post('/class-flashcards', data);
    return response.data;
  },
  createBatch: async (data: ClassFlashcardPayload[]): Promise<ClassFlashcard[]> => {
    const response = await api.post('/class-flashcards/batch', data);
    return response.data;
  },
  update: async (id: string, data: ClassFlashcardPayload): Promise<ClassFlashcard> => {
    const response = await api.put(`/class-flashcards/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/class-flashcards/${id}`);
  },
};
