import { api } from '@/lib/api';

export interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate: string;
  variableDefinitions: Record<string, string>;
  active: boolean;
  revision: number;
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplatePayload {
  code?: string;
  name: string;
  description?: string | null;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate: string;
  variableDefinitions: Record<string, string>;
  active: boolean;
  lockVersion?: number;
}

export interface EmailTemplatePreview {
  subject: string;
  html: string;
  text: string;
  imageUrls: string[];
}

export interface EmailTemplateVersion {
  id: string;
  revision: number;
  name: string;
  description?: string | null;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate: string;
  variableDefinitions: Record<string, string>;
  active: boolean;
  createdByUserId?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export const emailTemplateService = {
  getAll: async (): Promise<EmailTemplate[]> => {
    const response = await api.get('/admin/email-templates');
    return response.data;
  },
  create: async (payload: EmailTemplatePayload): Promise<EmailTemplate> => {
    const response = await api.post('/admin/email-templates', payload);
    return response.data;
  },
  update: async (id: string, payload: EmailTemplatePayload): Promise<EmailTemplate> => {
    const response = await api.put(`/admin/email-templates/${id}`, payload);
    return response.data;
  },
  updateStatus: async (id: string, active: boolean, lockVersion: number): Promise<EmailTemplate> => {
    const response = await api.patch(`/admin/email-templates/${id}/status`, { active, lockVersion });
    return response.data;
  },
  preview: async (payload: {
    subjectTemplate: string;
    htmlTemplate: string;
    textTemplate: string;
    data: Record<string, string>;
  }): Promise<EmailTemplatePreview> => {
    const response = await api.post('/admin/email-templates/preview', payload);
    return response.data;
  },
  getVersions: async (id: string): Promise<EmailTemplateVersion[]> => {
    const response = await api.get(`/admin/email-templates/${id}/versions`);
    return response.data;
  },
  restore: async (id: string, revision: number, lockVersion: number): Promise<EmailTemplate> => {
    const response = await api.post(`/admin/email-templates/${id}/versions/${revision}/restore`, { lockVersion });
    return response.data;
  },
};
