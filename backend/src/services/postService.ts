import type { BulkAction, Draft, PostPayload } from '../types/post.js';
import { createId } from '../utils/ids.js';
import { readJsonFile, writeJsonFile } from './storageService.js';

const postsFile = 'posts.json';
const draftsFile = 'drafts.json';
const scheduledFile = 'scheduled.json';

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

export async function getDraftById(id: string): Promise<Draft | undefined> {
  const drafts = await getDrafts();
  return drafts.find((item) => item.id === id);
}

export async function updateDraft(id: string, partial: Partial<PostPayload>): Promise<Draft | undefined> {
  const drafts = await getDrafts();
  const index = drafts.findIndex((item) => item.id === id);
  if (index < 0) return undefined;

  const now = new Date().toISOString();
  drafts[index] = { ...drafts[index], ...partial, updatedAt: now } as Draft;
  await writeJsonFile(draftsFile, drafts);
  return drafts[index];
}

export async function deleteDraft(id: string): Promise<boolean> {
  const drafts = await getDrafts();
  const index = drafts.findIndex((item) => item.id === id);
  if (index < 0) return false;

  drafts.splice(index, 1);
  await writeJsonFile(draftsFile, drafts);
  return true;
}

export async function bulkUpdateDrafts(bulk: BulkAction): Promise<Draft[]> {
  const drafts = await getDrafts();
  const now = new Date().toISOString();
  const idSet = new Set(bulk.ids);

  const updated = drafts.reduce<Draft[]>((acc, draft) => {
    if (!draft.id || !idSet.has(draft.id)) {
      acc.push(draft);
      return acc;
    }

    switch (bulk.action) {
      case 'delete':
        return acc;
      case 'archive':
        acc.push({ ...draft, isArchived: true, updatedAt: now });
        break;
      case 'unarchive':
        acc.push({ ...draft, isArchived: false, updatedAt: now });
        break;
      case 'favorite':
        acc.push({ ...draft, isFavorite: true, updatedAt: now });
        break;
      case 'unfavorite':
        acc.push({ ...draft, isFavorite: false, updatedAt: now });
        break;
      case 'trash':
        acc.push({ ...draft, isTrashed: true, updatedAt: now });
        break;
      case 'restore':
        acc.push({ ...draft, isTrashed: false, updatedAt: now });
        break;
      case 'tag':
        if (bulk.tag) {
          const tags = [...(draft.tags ?? [])];
          if (!tags.includes(bulk.tag)) tags.push(bulk.tag);
          acc.push({ ...draft, tags, updatedAt: now });
        } else {
          acc.push(draft);
        }
        break;
      case 'untag':
        if (bulk.tag) {
          acc.push({ ...draft, tags: (draft.tags ?? []).filter((t) => t !== bulk.tag), updatedAt: now });
        } else {
          acc.push(draft);
        }
        break;
      default:
        acc.push(draft);
    }
    return acc;
  }, []);

  await writeJsonFile(draftsFile, updated);
  return updated;
}

export async function getScheduledPosts(): Promise<PostPayload[]> {
  return readJsonFile<PostPayload[]>(scheduledFile, []);
}

export async function saveScheduledPost(payload: PostPayload): Promise<PostPayload> {
  const scheduled = await getScheduledPosts();
  const now = new Date().toISOString();
  const post: PostPayload = {
    ...payload,
    id: payload.id ?? createId('sched'),
    status: 'scheduled',
    createdAt: payload.createdAt || now,
    updatedAt: now
  };

  const index = scheduled.findIndex((item) => item.id === post.id);
  if (index >= 0) scheduled[index] = post;
  else scheduled.unshift(post);

  await writeJsonFile(scheduledFile, scheduled);
  return post;
}

export async function deleteScheduledPost(id: string): Promise<boolean> {
  const scheduled = await getScheduledPosts();
  const index = scheduled.findIndex((item) => item.id === id);
  if (index < 0) return false;

  scheduled.splice(index, 1);
  await writeJsonFile(scheduledFile, scheduled);
  return true;
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
