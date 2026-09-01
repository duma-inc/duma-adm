import { api } from '@/lib/api';

export interface CorrectionEntry {
  attemptId: number;
  exerciseId?: string;
  lessonId?: string;
  exerciseType?: string;
  answerGiven?: string;
  isCorrect?: boolean;
  score?: number;
  feedback?: string;
  correctedAt?: number;
}

export interface ExerciseCorrection {
  id: string;
  studentId: string;
  skillId?: string;
  planDate: string;
  totalCorrected?: number;
  status: 'PENDING_DELIVERY' | 'DELIVERED';
  seenByStudent: boolean;
  deliveredAt?: number;
  items: CorrectionEntry[];
}

export const exerciseCorrectionService = {
  // Consolida e envia ao aluno todas as correcoes CORRECTED do dia do attempt informado.
  consolidateFromAttempt: async (attemptId: string): Promise<ExerciseCorrection> => {
    const response = await api.post(`/exercise-corrections/from-attempt/${attemptId}`);
    return response.data;
  },
};
