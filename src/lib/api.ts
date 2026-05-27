import axios from 'axios';

const computedBaseUrl =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

api.interceptors.request.use((config) => {
  if (apiAccessToken) {
    if (typeof config.headers?.set === 'function') {
      config.headers.set('Authorization', `Bearer ${apiAccessToken}`);
    } else {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${apiAccessToken}`,
      };
    }
  } else if (config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Authorization');
    } else {
      delete (config.headers as Record<string, unknown>).Authorization;
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
