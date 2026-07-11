import type { Channel, Draft, PostPayload, PublishResponse } from '../types/post';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getChannels: () => request<Channel[]>('/api/channels'),
  getDrafts: () => request<Draft[]>('/api/drafts'),
  getPosts: () => request<PostPayload[]>('/api/posts'),
  saveDraft: (payload: PostPayload) =>
    request<Draft>('/api/drafts', { method: 'POST', body: JSON.stringify(payload) }),
  publishPost: (payload: PostPayload) =>
    request<PublishResponse>('/api/posts/publish', { method: 'POST', body: JSON.stringify(payload) })
};
