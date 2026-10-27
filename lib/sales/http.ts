import { config } from './config';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Thin typed fetch wrapper for when services move from seed data to the real backend.
// It adds no endpoints of its own: callers pass the existing backend path.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!config.apiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is not set.');
  }
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}
