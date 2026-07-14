import { Router } from 'express';
import { deleteScheduledPost, getScheduledPosts, normalizePostPayload, saveScheduledPost } from '../services/postService.js';

export const scheduleRouter = Router();

scheduleRouter.get('/', async (_request, response, next) => {
  try {
    response.json(await getScheduledPosts());
  } catch (error) {
    next(error);
  }
});

scheduleRouter.post('/', async (request, response, next) => {
  try {
    const payload = normalizePostPayload({ ...request.body, status: 'scheduled' });
    const post = await saveScheduledPost(payload);
    response.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

scheduleRouter.put('/:id', async (request, response, next) => {
  try {
    const scheduled = await getScheduledPosts();
    const existing = scheduled.find((p) => p.id === request.params.id);
    if (!existing) {
      response.status(404).json({ ok: false, error: 'Scheduled post not found' });
      return;
    }

    const updated = await saveScheduledPost({ ...existing, ...request.body, id: request.params.id });
    response.json(updated);
  } catch (error) {
    next(error);
  }
});

scheduleRouter.put('/:id/pause', async (request, response, next) => {
  try {
    const scheduled = await getScheduledPosts();
    const existing = scheduled.find((p) => p.id === request.params.id);
    if (!existing) {
      response.status(404).json({ ok: false, error: 'Scheduled post not found' });
      return;
    }

    const updated = await saveScheduledPost({
      ...existing,
      schedule: { ...existing.schedule!, isPaused: true }
    });
    response.json(updated);
  } catch (error) {
    next(error);
  }
});

scheduleRouter.put('/:id/resume', async (request, response, next) => {
  try {
    const scheduled = await getScheduledPosts();
    const existing = scheduled.find((p) => p.id === request.params.id);
    if (!existing) {
      response.status(404).json({ ok: false, error: 'Scheduled post not found' });
      return;
    }

    const updated = await saveScheduledPost({
      ...existing,
      schedule: { ...existing.schedule!, isPaused: false }
    });
    response.json(updated);
  } catch (error) {
    next(error);
  }
});

scheduleRouter.delete('/:id', async (request, response, next) => {
  try {
    const deleted = await deleteScheduledPost(request.params.id);
    if (!deleted) {
      response.status(404).json({ ok: false, error: 'Scheduled post not found' });
      return;
    }
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
