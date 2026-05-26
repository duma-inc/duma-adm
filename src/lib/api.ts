import axios from 'axios';
import { getSession } from 'next-auth/react';

const computedBaseUrl =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: computedBaseUrl,
});

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    try {
      const session: any = await getSession();
      console.log('[api] session:', {
        exists: !!session,
        temAccessToken: !!session?.accessToken,
        error: session?.error,
        tokenPreview: session?.accessToken ? String(session.accessToken).slice(0, 30) + '...' : null,
      });
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
    } catch (err) {
      console.warn('[api] Falha ao obter sessão:', err);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;
    console.error(`[api] Erro ${status ?? 'rede'} em ${url}:`, error?.response?.data ?? error?.message);
    return Promise.reject(error);
  }
);
