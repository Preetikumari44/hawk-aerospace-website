// Environment-specific values live here and nowhere else. Never hard-code URLs in components.
export const config = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
} as const;
