import type { AnalyticsSnapshot, BulkAction, Channel, Draft, PostPayload, PublishResponse, Template } from '../types/post';

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
  // ── Channels ──
  getChannels: (params?: { search?: string; sort?: string }) => {
    const query = buildQuery(params);
    return request<Channel[]>(`/api/channels${query}`);
  },
  saveChannel: (channel: Partial<Channel>) =>
    request<Channel>('/api/channels', { method: 'POST', body: JSON.stringify(channel) }),
  updateChannel: (id: string, data: Partial<Channel>) =>
    request<Channel>(`/api/channels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChannel: (id: string) =>
    request<{ ok: boolean }>(`/api/channels/${id}`, { method: 'DELETE' }),
  setDefaultChannel: (id: string) =>
    request<Channel>(`/api/channels/${id}/default`, { method: 'PUT' }),
  toggleChannelFavorite: (id: string) =>
    request<Channel>(`/api/channels/${id}/favorite`, { method: 'PUT' }),
  discoverChannel: (identifier: string) =>
    request<Channel>('/api/channels/discover', { method: 'POST', body: JSON.stringify({ identifier }) }),
  refreshChannels: () =>
    request<Channel[]>('/api/channels/refresh', { method: 'POST' }),

  // ── Drafts ──
  getDrafts: (params?: { search?: string; sort?: string; filter?: string }) => {
    const query = buildQuery(params);
    return request<Draft[]>(`/api/drafts${query}`);
  },
  getDraft: (id: string) => request<Draft>(`/api/drafts/${id}`),
  saveDraft: (payload: PostPayload) =>
    request<Draft>('/api/drafts', { method: 'POST', body: JSON.stringify(payload) }),
  updateDraft: (id: string, data: Partial<PostPayload>) =>
    request<Draft>(`/api/drafts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDraft: (id: string, permanent = false) =>
    request<{ ok: boolean }>(`/api/drafts/${id}?permanent=${permanent}`, { method: 'DELETE' }),
  bulkDrafts: (action: BulkAction) =>
    request<Draft[]>('/api/drafts/bulk', { method: 'POST', body: JSON.stringify(action) }),

  // ── Posts ──
  getPosts: () => request<PostPayload[]>('/api/posts'),
  publishPost: (payload: PostPayload) =>
    request<PublishResponse>('/api/posts/publish', { method: 'POST', body: JSON.stringify(payload) }),

  // ── Schedule ──
  getScheduled: () => request<PostPayload[]>('/api/schedule'),
  schedulePost: (payload: PostPayload) =>
    request<PostPayload>('/api/schedule', { method: 'POST', body: JSON.stringify(payload) }),
  updateSchedule: (id: string, data: Partial<PostPayload>) =>
    request<PostPayload>(`/api/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  pauseSchedule: (id: string) =>
    request<PostPayload>(`/api/schedule/${id}/pause`, { method: 'PUT' }),
  resumeSchedule: (id: string) =>
    request<PostPayload>(`/api/schedule/${id}/resume`, { method: 'PUT' }),
  cancelSchedule: (id: string) =>
    request<{ ok: boolean }>(`/api/schedule/${id}`, { method: 'DELETE' }),

  // ── Templates ──
  getTemplates: (params?: { search?: string; category?: string }) => {
    const query = buildQuery(params);
    return request<Template[]>(`/api/templates${query}`);
  },
  getTemplate: (id: string) => request<Template>(`/api/templates/${id}`),
  saveTemplate: (template: Partial<Template>) =>
    request<Template>('/api/templates', { method: 'POST', body: JSON.stringify(template) }),
  updateTemplate: (id: string, data: Partial<Template>) =>
    request<Template>(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id: string) =>
    request<{ ok: boolean }>(`/api/templates/${id}`, { method: 'DELETE' }),

  // ── Analytics ──
  getAnalytics: () => request<AnalyticsSnapshot>('/api/analytics')
};

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][];
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}
