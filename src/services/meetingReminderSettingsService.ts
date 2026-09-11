import { api } from '@/lib/api';
export type MeetingType = 'PRACTICAL' | 'CONTENT' | 'ASSESSMENT';
export interface MeetingReminderSettings { reminderLeadHours: number; enabledMeetingTypes: MeetingType[]; teacherDailyScheduleTime: string; }
export const meetingReminderSettingsService = { get: async (): Promise<MeetingReminderSettings> => (await api.get('/admin/meeting-reminder-settings')).data, update: async (payload: MeetingReminderSettings): Promise<MeetingReminderSettings> => (await api.put('/admin/meeting-reminder-settings', payload)).data };
