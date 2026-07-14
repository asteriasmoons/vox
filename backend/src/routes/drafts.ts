import { Router } from 'express';
import { bulkUpdateDrafts, deleteDraft, getDraftById, getDrafts, normalizePostPayload, saveDraft, updateDraft } from '../services/postService.js';
import type { BulkAction, Draft } from '../types/post.js';

export const draftsRouter = Router();

draftsRouter.get('/', async (request, response, next) => {
  try {
    let drafts = await getDrafts();
    const { search, sort, filter } = request.query;

    if (filter) {
      const f = filter as string;
      if (f === 'favorites') drafts = drafts.filter((d) => d.isFavorite);
      else if (f === 'archived') drafts = drafts.filter((d) => d.isArchived);
      else if (f === 'trashed') drafts = drafts.filter((d) => d.isTrashed);
      else if (f.startsWith('tag:')) {
        const tag = f.slice(4);
        drafts = drafts.filter((d) => d.tags?.includes(tag));
      }
      // 'all' or unrecognized — return everything
    }

    if (search) {
      const q = (search as string).toLowerCase();
      drafts = drafts.filter(
        (d) => d.title.toLowerCase().includes(q) || d.text.toLowerCase().includes(q)
      );
    }

    if (sort) {
      const s = sort as string;
      if (s === 'title') drafts.sort((a, b) => a.title.localeCompare(b.title));
      else if (s === 'oldest') drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      else if (s === 'updated') drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      else drafts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    response.json(drafts);
  } catch (error) {
    next(error);
  }
});

draftsRouter.get('/:id', async (request, response, next) => {
  try {
    const draft = await getDraftById(request.params.id);
    if (!draft) {
      response.status(404).json({ ok: false, error: 'Draft not found' });
      return;
    }
    response.json(draft);
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

draftsRouter.post('/bulk', async (request, response, next) => {
  try {
    const bulk = request.body as BulkAction;
    const updated = await bulkUpdateDrafts(bulk);
    response.json(updated);
  } catch (error) {
    next(error);
  }
});

draftsRouter.put('/:id', async (request, response, next) => {
  try {
    const draft = await updateDraft(request.params.id, request.body);
    if (!draft) {
      response.status(404).json({ ok: false, error: 'Draft not found' });
      return;
    }
    response.json(draft);
  } catch (error) {
    next(error);
  }
});

draftsRouter.delete('/:id', async (request, response, next) => {
  try {
    const existing = await getDraftById(request.params.id);
    if (!existing) {
      response.status(404).json({ ok: false, error: 'Draft not found' });
      return;
    }

    if (existing.isTrashed) {
      await deleteDraft(request.params.id);
      response.json({ ok: true, permanent: true });
    } else {
      await updateDraft(request.params.id, { isTrashed: true } as Partial<Draft>);
      response.json({ ok: true, permanent: false });
    }
  } catch (error) {
    next(error);
  }
});
