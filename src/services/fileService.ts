import { api } from '@/lib/api';

export interface UploadIntentPayload {
  fileName: string;
  contentType: string;
  size?: number;
}

export interface UploadIntentResponse {
  id: number;
  uploadUrl: string;
}

export interface FileResponse {
  id: number;
  originalName: string;
  storageKey: string;
  bucket: string;
  contentType: string;
  sizeBytes: number;
  publicUrl: string;
  status: string;
}

export const fileService = {
  createUploadIntent: async (data: UploadIntentPayload): Promise<UploadIntentResponse> => {
    const response = await api.post('/files/upload-intents', data);
    return response.data;
  },
  uploadToStorage: async (uploadUrl: string, file: File): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error('Falha no upload do arquivo');
    }
  },
  completeUpload: async (id: number | string): Promise<FileResponse> => {
    const response = await api.post(`/files/${id}/complete`);
    return response.data;
  },
};
