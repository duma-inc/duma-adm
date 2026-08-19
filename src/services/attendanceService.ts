import { api } from '@/lib/api';

export interface Attendance {
  id: number;
  studentId: string;
  meetingId: string;
  status: boolean;
  notes?: string;
  checkedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export const attendanceService = {
  getByMeetingId: async (meetingId: string): Promise<Attendance[]> => {
    const response = await api.get(`/attendances/meeting/${meetingId}`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/attendances/${id}`);
  },
};
