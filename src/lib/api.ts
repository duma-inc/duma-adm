import axios from 'axios';
import { getSession } from 'next-auth/react';
import type { SessionWithAccessToken } from '@/types/auth';

const computedBaseUrl =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Token em cache so para evitar um getSession() por request. A fonte de verdade e
 * sempre a sessao: guardar o token numa variavel alimentada por useEffect criava uma
 * corrida em que a primeira carga de cada tela saia sem Authorization, e o backend
 * respondia como usuario anonimo.
 */
let apiAccessToken: string | null = null;

export const api = axios.create({
  baseURL: computedBaseUrl,
});

export function setApiAccessToken(token: string | null) {
  apiAccessToken = token;
}

export function clearApiAccessToken() {
  apiAccessToken = null;
}

async function resolveAccessToken(): Promise<string | null> {
  if (apiAccessToken) return apiAccessToken;
  if (typeof window === 'undefined') return null;

  const session = (await getSession()) as SessionWithAccessToken | null;
  apiAccessToken = session?.accessToken ?? null;
  return apiAccessToken;
}

api.interceptors.request.use(async (config) => {
  const token = await resolveAccessToken();

  // No axios 1.x config.headers e sempre um AxiosHeaders.
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    config.headers.delete('Authorization');
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
