import { api } from '@/lib/api';

export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
export type MeetingType = 'PRACTICAL' | 'CONTENT' | 'ASSESSMENT';
/** Duracao prevista do encontro. Ausente/null = tempo livre: o toolkit nao exibe timer. */
export type MeetingDuration = 'MINUTES_15' | 'MINUTES_30' | 'MINUTES_45' | 'MINUTES_60';

export interface Meeting {
  id?: string;
  meetingId?: string;
  uuid?: string;
  title: string;
  description?: string;
  teacherId: string;
  meetingType: MeetingType;
  skillId: number;
  stageId: number | null;
  lessonId: number | string | null;
  planId: number | null;
  scheduledStart: string;
  duration?: MeetingDuration | null;
  /** Preenchido apenas para colaboradores/tutores; para aluno vem null. */
  attendanceKeyword?: string | null;
  hasAttendanceKeyword?: boolean;
  meetingUrl?: string;
  recordingUrl?: string;
  status: MeetingStatus;
}

export type MeetingPayload = Omit<Meeting, 'id'>;

export const meetingService = {
  getAll: async (): Promise<Meeting[]> => {
    const response = await api.get('/meetings');
    return response.data;
  },
  getById: async (id: number | string): Promise<Meeting> => {
    const response = await api.get(`/meetings/${id}`);
    return response.data;
  },
  getByTeacherId: async (teacherId: string): Promise<Meeting[]> => {
    const response = await api.get('/meetings/teacherId', {
      params: { id: teacherId },
    });
    return response.data;
  },
  getBySkillId: async (skillId: number): Promise<Meeting[]> => {
    const response = await api.get('/meetings/skillId', {
      params: { id: skillId },
    });
    return response.data;
  },
  create: async (data: MeetingPayload): Promise<Meeting> => {
    const response = await api.post('/meetings', data);
    return response.data;
  },
  createBatch: async (data: MeetingPayload[]): Promise<Meeting[]> => {
    const response = await api.post('/meetings/batch', data);
    return response.data;
  },
  update: async (id: number | string, data: Partial<MeetingPayload>): Promise<Meeting> => {
    const response = await api.put(`/meetings/${id}`, data);
    return response.data;
  },
  delete: async (id: number | string): Promise<void> => {
    await api.delete(`/meetings/${id}`);
  },
};
