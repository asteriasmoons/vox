import type { PostPayload } from '../types/post.js';

const scheduledPosts = new Map<string, NodeJS.Timeout>();

export function schedulePost(post: PostPayload, publishAt: Date, publish: (post: PostPayload) => Promise<void>): string {
  const id = post.id ?? `scheduled_${Date.now()}`;
  const delay = Math.max(publishAt.getTime() - Date.now(), 0);

  const timer = setTimeout(() => {
    void publish(post);
    scheduledPosts.delete(id);
  }, delay);

  scheduledPosts.set(id, timer);
  return id;
}

export function cancelScheduledPost(id: string): boolean {
  const timer = scheduledPosts.get(id);
  if (!timer) return false;

  clearTimeout(timer);
  scheduledPosts.delete(id);
  return true;
}
