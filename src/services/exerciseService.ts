import { api } from '@/lib/api';

export type ExerciseType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'TRANSLATION'
  | 'FILL_IN_THE_BLANK'
  | 'MATCHING'
  | 'SHORT_ANSWER'
  | 'ESSAY'
  | 'SPEAKING'
  | 'LISTENING';

/**
 * Tipos dissertativos: o aluno escreve livremente e a correcao e feita pela IA,
 * entao nao existe gabarito em `options`. Todo o resto sempre traz opcoes
 * (inclusive SPEAKING, cuja unica opcao e a frase-alvo).
 */
export const TYPES_WITHOUT_OPTIONS: ExerciseType[] = ['ESSAY', 'SHORT_ANSWER'];

export const requiresOptions = (type: ExerciseType) => !TYPES_WITHOUT_OPTIONS.includes(type);

export type ExerciseDifficulty = 'EASY' | 'MODERATE' | 'HARD';
export type ExerciseLanguage = string; // ex: "en", "pt", "pt-BR", "en-US"
export type ExerciseOrigin = 'LEVEL_TEST' | 'LESSON' | 'PRACTICE' | 'BASE';
export type ExerciseStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';
export type ExerciseReusePolicy = 'GLOBAL_REUSABLE' | 'LESSON_ONLY' | 'SINGLE_USE';

export interface ExerciseOption {
  optionId?: string;
  text: string;
  matchKey?: string | null;
  isCorrect: boolean;
}

export interface Exercise {
  id: string;
  lessonId?: string;
  skillId?: string;
  stageId?: number;
  description: string;
  translation?: string;
  explanation?: string;
  type: ExerciseType;
  difficulty: ExerciseDifficulty;
  language: ExerciseLanguage;
  status?: ExerciseStatus;
  origin: ExerciseOrigin;
  reusePolicy?: ExerciseReusePolicy;
  options: ExerciseOption[];
}

export const exerciseService = {
  getAll: async (): Promise<Exercise[]> => {
    const response = await api.get('/exercises');
    return response.data;
  },
  getById: async (id: string): Promise<Exercise> => {
    const response = await api.get(`/exercises/${id}`);
    return response.data;
  },
  create: async (data: Omit<Exercise, 'id'>): Promise<Exercise> => {
    const response = await api.post('/exercises', data);
    return response.data;
  },
  createBatch: async (data: Omit<Exercise, 'id'>[]): Promise<Exercise[]> => {
    const response = await api.post('/exercises/batch', data);
    return response.data;
  },
  update: async (id: string, data: Partial<Exercise>): Promise<Exercise> => {
    const response = await api.put(`/exercises/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/exercises/${id}`);
  },
};
