import type { QuestionPack } from '@gigaquiz/shared';

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  getPacks: () => request<QuestionPack[]>('/packs'),
  getPack: (id: string) => request<QuestionPack>(`/packs/${id}`),
  createPack: (data: unknown) => request<QuestionPack>('/packs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updatePack: (id: string, data: unknown) => request<QuestionPack>(`/packs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deletePack: (id: string) => request<void>(`/packs/${id}`, { method: 'DELETE' }),
  uploadImage: (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string }>('/packs/upload/image', { method: 'POST', body: form });
  },
};
