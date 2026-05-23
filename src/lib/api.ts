import axios from 'axios';
import type { Session } from 'next-auth';
import { getSession } from 'next-auth/react';

// Use relative path '/api' when running in production (served behind reverse proxy).
// Fall back to NEXT_PUBLIC_API_URL or localhost during development.
const computedBaseUrl =
  process.env.NODE_ENV === 'production'
    ? '/api'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: computedBaseUrl,
});

const SESSION_RETRY_DELAY_MS = 250;
const SESSION_MAX_RETRIES = 8;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const IS_LOCAL_API =
  API_BASE_URL.includes('localhost:8080') ||
  API_BASE_URL.includes('127.0.0.1:8080');
const FORCE_API_AUTH = process.env.NEXT_PUBLIC_FORCE_API_AUTH === 'true';
const SKIP_AUTH_FOR_LOCAL_DEV_API =
  process.env.NODE_ENV !== 'production' && IS_LOCAL_API && !FORCE_API_AUTH;

type AuthSession = Session & {
  accessToken?: string;
  error?: string;
};

async function waitForSession() {
  for (let attempt = 0; attempt <= SESSION_MAX_RETRIES; attempt += 1) {
    const session = (await getSession()) as AuthSession | null;

    if (session?.accessToken || session?.error) {
      return session;
    }

    if (attempt < SESSION_MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_DELAY_MS));
    }
  }

  return null;
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    if (SKIP_AUTH_FOR_LOCAL_DEV_API) {
      console.info('[api] Authorization desabilitado para API local em desenvolvimento:', config.url);
      return config;
    }

    try {
      const session = await waitForSession();
      console.log('[api] session:', {
        exists: !!session,
        temAccessToken: !!session?.accessToken,
        error: session?.error,
        tokenPreview: session?.accessToken ? String(session.accessToken).slice(0, 30) + '...' : null,
      });
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      } else {
        console.warn('[api] Requisição cancelada por ausência de access token:', config.url);
        throw new axios.CanceledError('Sessão ainda não autenticada no cliente.');
      }
    } catch (err) {
      console.warn('[api] Falha ao obter sessão:', err);
      return Promise.reject(err);
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
