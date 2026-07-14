import { Router } from 'express';
import { deleteTemplate, getTemplateById, getTemplates, saveTemplate } from '../services/templateService.js';

export const templatesRouter = Router();

templatesRouter.get('/', async (request, response, next) => {
  try {
    let templates = await getTemplates();
    const { search, category } = request.query;

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    if (search) {
      const q = (search as string).toLowerCase();
      templates = templates.filter(
        (t) => t.name.toLowerCase().includes(q) || t.text.toLowerCase().includes(q)
      );
    }

    response.json(templates);
  } catch (error) {
    next(error);
  }
});

templatesRouter.get('/:id', async (request, response, next) => {
  try {
    const template = await getTemplateById(request.params.id);
    if (!template) {
      response.status(404).json({ ok: false, error: 'Template not found' });
      return;
    }
    response.json(template);
  } catch (error) {
    next(error);
  }
});

templatesRouter.post('/', async (request, response, next) => {
  try {
    const template = await saveTemplate(request.body);
    response.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

templatesRouter.put('/:id', async (request, response, next) => {
  try {
    const existing = await getTemplateById(request.params.id);
    if (!existing) {
      response.status(404).json({ ok: false, error: 'Template not found' });
      return;
    }

    const template = await saveTemplate({ ...existing, ...request.body, id: request.params.id });
    response.json(template);
  } catch (error) {
    next(error);
  }
});

templatesRouter.delete('/:id', async (request, response, next) => {
  try {
    const result = await deleteTemplate(request.params.id);
    if (!result.ok) {
      response.status(result.error === 'Template not found' ? 404 : 400).json(result);
      return;
    }
    response.json(result);
  } catch (error) {
    next(error);
  }
});
