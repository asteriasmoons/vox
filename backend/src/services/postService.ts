import type { Draft, PostPayload } from '../types/post.js';
import { createId } from '../utils/ids.js';
import { readJsonFile, writeJsonFile } from './storageService.js';

const postsFile = 'posts.json';
const draftsFile = 'drafts.json';

export async function getPosts(): Promise<PostPayload[]> {
  return readJsonFile<PostPayload[]>(postsFile, []);
}

export async function getDrafts(): Promise<Draft[]> {
  return readJsonFile<Draft[]>(draftsFile, []);
}

export async function saveDraft(payload: PostPayload): Promise<Draft> {
  const drafts = await getDrafts();
  const now = new Date().toISOString();
  const draft: Draft = {
    ...payload,
    id: payload.id ?? createId('draft'),
    status: 'draft',
    createdAt: payload.createdAt || now,
    updatedAt: now
  };

  const index = drafts.findIndex((item) => item.id === draft.id);
  if (index >= 0) drafts[index] = draft;
  else drafts.unshift(draft);

  await writeJsonFile(draftsFile, drafts);
  return draft;
}

export async function savePostedPost(payload: PostPayload): Promise<PostPayload> {
  const posts = await getPosts();
  const now = new Date().toISOString();
  const post: PostPayload = {
    ...payload,
    id: payload.id ?? createId('post'),
    status: 'posted',
    createdAt: payload.createdAt || now,
    updatedAt: now
  };

  posts.unshift(post);
  await writeJsonFile(postsFile, posts);
  return post;
}

export function normalizePostPayload(payload: Partial<PostPayload>): PostPayload {
  const now = new Date().toISOString();

  return {
    title: payload.title?.trim() || 'Untitled Announcement',
    channelId: payload.channelId ?? '',
    text: payload.text ?? '',
    parseMode: 'HTML',
    buttons: payload.buttons ?? [],
    status: payload.status ?? 'draft',
    createdAt: payload.createdAt ?? now,
    updatedAt: now
  };
}
