import { api } from '@/lib/api';

export type CommunicationChannel = 'EMAIL' | 'IN_APP';

export type EmailDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

export type NotificationType = 'GENERAL' | 'TUTOR_FEEDBACK';

/** Teto imposto pelo backend em SendCommunicationRequest.studentIds. */
export const MAX_RECIPIENTS_PER_BATCH = 200;

export interface SendCommunicationPayload {
  studentIds: string[];
  category?: string;
  subject?: string;
  message?: string;
  template?: string;
  templateData?: Record<string, string>;
  channels?: CommunicationChannel[];
  notificationType?: NotificationType;
  notificationTitle?: string;
  notificationMessage?: string;
  referenceId?: string;
  actionUrl?: string;
  force?: boolean;
}

export interface CommunicationRecipientResult {
  studentId: string;
  email: string;
  notificationId?: string | null;
  emailDeliveryId?: string | null;
  emailStatus?: EmailDeliveryStatus | null;
  skipped: boolean;
  error?: string | null;
}

export interface CommunicationBatchResult {
  recipients: number;
  emailsSent: number;
  emailsFailed: number;
  notificationsCreated: number;
  skipped: number;
  results: CommunicationRecipientResult[];
}

export const communicationService = {
  send: async (payload: SendCommunicationPayload): Promise<CommunicationBatchResult> => {
    const response = await api.post('/admin/communications', payload);
    return response.data;
  },
};
