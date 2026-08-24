import { api } from '@/lib/api';

export type SlideDeckFormat = 'IMAGES' | 'PDF' | 'PPTX';

export interface SlideDeckPage {
  id: string;
  pageNumber: number;
  imageUrl: string | null;
  title?: string;
  notes?: string;
}

export interface SlideDeck {
  id: string;
  title: string;
  description?: string;
  lessonId?: string | null;
  meetingId?: string | null;
  format: SlideDeckFormat;
  fileUrl?: string | null;
  /** false para PPTX: o navegador não renderiza pptx, então ele não é projetável na aula. */
  projectable: boolean;
  pages: SlideDeckPage[];
}

export interface SlideDeckPagePayload {
  fileId: number;
  title?: string;
  notes?: string;
}

export interface SlideDeckPayload {
  title: string;
  description?: string;
  lessonId?: string | null;
  meetingId?: string | null;
  format: SlideDeckFormat;
  /** PDF e PPTX: um arquivo só. */
  fileId?: number | null;
  /** IMAGES: uma página por imagem, na ordem de apresentação. */
  pages?: SlideDeckPagePayload[];
}

export const slideDeckService = {
  getAll: async (): Promise<SlideDeck[]> => {
    const response = await api.get('/slide-decks/admin');
    return response.data;
  },
  getById: async (id: string): Promise<SlideDeck> => {
    const response = await api.get(`/slide-decks/${id}`);
    return response.data;
  },
  create: async (data: SlideDeckPayload): Promise<SlideDeck> => {
    const response = await api.post('/slide-decks', data);
    return response.data;
  },
  /** Substitui o deck inteiro, páginas inclusas — mande a lista completa e na ordem. */
  update: async (id: string, data: SlideDeckPayload): Promise<SlideDeck> => {
    const response = await api.put(`/slide-decks/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/slide-decks/${id}`);
  },
};
