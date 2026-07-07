import { Router } from 'express';
import { publishPostToTelegram } from '../bot/telegramService.js';
import { getPosts, normalizePostPayload, savePostedPost } from '../services/postService.js';
import type { PublishResponse } from '../types/post.js';

export const postsRouter = Router();

postsRouter.get('/', async (_request, response, next) => {
  try {
    response.json(await getPosts());
  } catch (error) {
    next(error);
  }
});

postsRouter.post('/publish', async (request, response, next) => {
  try {
    const payload = normalizePostPayload({ ...request.body, status: 'posted' });
    const telegramMessageId = await publishPostToTelegram(payload);
    const post = await savePostedPost(payload);

    const result: PublishResponse = {
      ok: true,
      post,
      telegramMessageId
    };

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
