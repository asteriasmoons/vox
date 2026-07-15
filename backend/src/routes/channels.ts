import { Router } from 'express';
import {
  addManualChannel,
  ChannelInputError,
  deleteChannel,
  getChannelPhotoFileId,
  getChannels,
  saveChannel,
  setDefaultChannel,
} from '../services/channelService.js';
import { getTelegramClient } from '../bot/telegramClient.js';
import type { Channel } from '../types/post.js';

export const channelsRouter = Router();

channelsRouter.get('/', async (request, response, next) => {
  try {
    const channels = await getChannels({ forceRefresh: request.query.refresh === 'true' });
    const { search, sort } = request.query;
    let result = [...channels];

    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter(
        (channel) =>
          channel.name.toLowerCase().includes(q) ||
          (channel.username ?? '').toLowerCase().includes(q),
      );
    }

    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'members') result.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));

    response.json(result);
  } catch (error) {
    next(error);
  }
});

channelsRouter.get('/:id/photo', async (request, response, next) => {
  try {
    const fileId = await getChannelPhotoFileId(request.params.id);

    if (!fileId) {
      response.status(404).json({ ok: false, error: 'Channel photo not found' });
      return;
    }

    const stream = getTelegramClient().getFileStream(fileId);
    response.type('jpg');
    response.setHeader('Cache-Control', 'private, max-age=3600');
    stream.on('error', next);
    stream.pipe(response);
  } catch (error) {
    next(error);
  }
});

channelsRouter.post('/discover', async (request, response, next) => {
  try {
    const { identifier } = request.body as { identifier?: string };
    const channel = await addManualChannel(identifier ?? '');
    response.status(201).json(channel);
  } catch (error) {
    if (error instanceof ChannelInputError) {
      response.status(error.status).json({ ok: false, code: error.code, error: error.message });
      return;
    }

    next(error);
  }
});

channelsRouter.post('/refresh', async (_request, response, next) => {
  try {
    response.json(await getChannels({ forceRefresh: true }));
  } catch (error) {
    next(error);
  }
});

channelsRouter.post('/', async (request, response, next) => {
  try {
    const channel = request.body as Channel;
    const result = await saveChannel({ ...channel, source: channel.source ?? 'manual' });
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

channelsRouter.put('/:id/default', async (request, response, next) => {
  try {
    response.json(await setDefaultChannel(request.params.id));
  } catch (error) {
    next(error);
  }
});

channelsRouter.put('/:id/favorite', async (request, response, next) => {
  try {
    const channels = await getChannels();
    const channel = channels.find((item) => item.id === request.params.id);

    if (!channel) {
      response.status(404).json({ ok: false, error: 'Channel not found' });
      return;
    }

    response.json(await saveChannel({ ...channel, isFavorite: !channel.isFavorite }));
  } catch (error) {
    next(error);
  }
});

channelsRouter.put('/:id', async (request, response, next) => {
  try {
    const channels = await getChannels();
    const channel = channels.find((item) => item.id === request.params.id);

    if (!channel) {
      response.status(404).json({ ok: false, error: 'Channel not found' });
      return;
    }

    response.json(await saveChannel({ ...channel, ...request.body }));
  } catch (error) {
    next(error);
  }
});

channelsRouter.delete('/:id', async (request, response, next) => {
  try {
    const deleted = await deleteChannel(request.params.id);

    if (!deleted) {
      response.status(404).json({ ok: false, error: 'Channel not found or cannot be removed' });
      return;
    }

    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
