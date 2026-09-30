import { apiRequest as superAppApiRequest } from '../../utils/api';

export interface ApiRequestOptions extends RequestInit {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const apiRequest = async <T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  try {
    return (await superAppApiRequest(path, options)) as T;
  } catch (error: any) {
    throw new ApiError(error?.message || 'Request failed', error?.status ?? 0);
  }
};

export const buildQuerySuffix = (params: Record<string, unknown> = {}): string => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  const query = new URLSearchParams();
  entries.forEach(([key, value]) => query.set(key, String(value)));
  return `?${query.toString()}`;
};
