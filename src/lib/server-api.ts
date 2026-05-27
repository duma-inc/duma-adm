const SERVER_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type FetchBackendJsonOptions = {
  accessToken: string;
  timeoutMs?: number;
  revalidateSeconds?: number;
};

export class BackendRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'BackendRequestError';
  }
}

export async function fetchBackendJson<T>(
  path: string,
  { accessToken, timeoutMs = 15000, revalidateSeconds }: FetchBackendJsonOptions,
): Promise<T> {
  const url = new URL(path, SERVER_API_BASE_URL).toString();
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: revalidateSeconds ? 'force-cache' : 'no-store',
    next: revalidateSeconds ? { revalidate: revalidateSeconds } : undefined,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new BackendRequestError(`Erro ${response.status} ao acessar ${path}`, response.status, body);
  }

  return body as T;
}
