import type { AuthPayload, User } from './types';

export const TOKEN_KEY = 'motivisk_token';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.message === 'string' ? payload.message : 'Request failed';
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export async function apiBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${BASE}${path}`, { headers });
  if (!response.ok) throw new ApiError('Could not load the recording', response.status);
  return response.blob();
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ data: AuthPayload }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body: { name: string; email: string; password: string; phone?: string; preferredLanguage: 'en' | 'te' }) =>
    api<{ data: AuthPayload }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => api<{ data: { user: User; counsellor: AuthPayload['counsellor'] } }>('/auth/me'),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api<{ data: User }>('/auth/password', { method: 'PATCH', body: JSON.stringify(body) }),
};
