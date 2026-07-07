import { Router } from 'express';
import { getDrafts, normalizePostPayload, saveDraft } from '../services/postService.js';

export const draftsRouter = Router();

draftsRouter.get('/', async (_request, response, next) => {
  try {
    response.json(await getDrafts());
  } catch (error) {
    next(error);
  }
});

draftsRouter.post('/', async (request, response, next) => {
  try {
    const payload = normalizePostPayload(request.body);
    const draft = await saveDraft(payload);
    response.status(201).json(draft);
  } catch (error) {
    next(error);
  }
});
