import { api } from '@/lib/api';

export interface NotificationResponse {
  id: string;
  studentId: string;
  title: string;
  message: string;
  type: 'TUTOR_FEEDBACK' | 'EXERCISE_SUBMITTED' | 'TEST_COMPLETED' | 'GENERAL';
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CreateNotificationPayload {
  studentId: string;
  title: string;
  message: string;
  type: 'TUTOR_FEEDBACK' | 'GENERAL';
  referenceId?: string;
}

export const notificationService = {
  getAll: async (): Promise<NotificationResponse[]> => {
    const response = await api.get('/notifications/all');
    return response.data;
  },
  create: async (data: CreateNotificationPayload): Promise<NotificationResponse> => {
    const response = await api.post('/notifications', data);
    return response.data;
  },
};
