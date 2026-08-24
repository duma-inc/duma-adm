import { api } from '@/lib/api';

export type GameType = 'EMBED' | 'NATIVE';
export type NativeGameKind = 'MEMORY' | 'SCRAMBLE' | 'QUIZ' | 'SENTENCE_BUILDER' | 'WORD_MATCH';

export interface Game {
  id: string;
  title: string;
  description?: string;
  category?: string;
  lessonId?: string | null;
  stageId?: number | null;
  skillId?: number | null;
  type: GameType;
  embedUrl?: string | null;
  nativeKind?: NativeGameKind | null;
  /** Pack de dados do engine nativo — formato varia por nativeKind. */
  payload?: unknown;
  thumbnailUrl?: string | null;
}

export interface GamePayload {
  title: string;
  description?: string;
  category?: string;
  lessonId?: string | null;
  stageId?: number | null;
  skillId?: number | null;
  type: GameType;
  embedUrl?: string | null;
  /** EMBED: HTML autocontido enviado ao R2. Tem precedência sobre embedUrl. */
  fileId?: number | null;
  nativeKind?: NativeGameKind | null;
  payload?: unknown;
  thumbnailUrl?: string | null;
  isActive?: boolean;
}

export const gameService = {
  /** Catálogo completo, inativos inclusos — é o que as telas do adm precisam ver. */
  getAll: async (): Promise<Game[]> => {
    const response = await api.get('/games/admin');
    return response.data;
  },
  getById: async (id: string): Promise<Game> => {
    const response = await api.get(`/games/${id}`);
    return response.data;
  },
  create: async (data: GamePayload): Promise<Game> => {
    const response = await api.post('/games', data);
    return response.data;
  },
  update: async (id: string, data: GamePayload): Promise<Game> => {
    const response = await api.put(`/games/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/games/${id}`);
  },
};
