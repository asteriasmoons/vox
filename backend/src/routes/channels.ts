import { Router } from 'express';
import { deleteChannel, getChannels, saveChannel, saveChannels, setDefaultChannel } from '../services/channelService.js';
import type { Channel } from '../types/post.js';

function getFallbackChannel(): Channel | null {
  const id = process.env.TELEGRAM_DEFAULT_CHANNEL_ID;

  if (!id) {
    return null;
  }

  return {
    id,
    name: process.env.TELEGRAM_DEFAULT_CHANNEL_NAME ?? 'Default Telegram Channel',
    telegramChatId: id,
    description: process.env.TELEGRAM_DEFAULT_CHANNEL_DESCRIPTION ?? 'Fallback channel from environment config',
    isDefault: true
  };
}

export const channelsRouter = Router();

channelsRouter.get('/', async (request, response, next) => {
  try {
    let channels = await getChannels();
    const fallbackChannel = getFallbackChannel();

    if (channels.length === 0 && fallbackChannel) {
      response.json([fallbackChannel]);
      return;
    }

    const { search, sort } = request.query;

    if (search) {
      const q = (search as string).toLowerCase();
      channels = channels.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
      );
    }

    if (sort) {
      const s = sort as string;
      if (s === 'name') channels.sort((a, b) => a.name.localeCompare(b.name));
      else if (s === 'members') channels.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
    }

    response.json(channels);
  } catch (error) {
    next(error);
  }
});

channelsRouter.post('/', async (request, response, next) => {
  try {
    const channels = await getChannels();
    const channel = request.body as Channel;
    const nextChannels = [channel, ...channels.filter((item) => item.id !== channel.id)];
    response.status(201).json(await saveChannels(nextChannels));
  } catch (error) {
    next(error);
  }
});

channelsRouter.put('/:id', async (request, response, next) => {
  try {
    const channels = await getChannels();
    const index = channels.findIndex((c) => c.id === request.params.id);
    if (index < 0) {
      response.status(404).json({ ok: false, error: 'Channel not found' });
      return;
    }

    const updated = { ...channels[index], ...request.body } as Channel;
    const result = await saveChannel(updated);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

channelsRouter.delete('/:id', async (request, response, next) => {
  try {
    const deleted = await deleteChannel(request.params.id);
    if (!deleted) {
      response.status(404).json({ ok: false, error: 'Channel not found' });
      return;
    }
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

channelsRouter.put('/:id/default', async (request, response, next) => {
  try {
    const channels = await setDefaultChannel(request.params.id);
    response.json(channels);
  } catch (error) {
    next(error);
  }
});

channelsRouter.put('/:id/favorite', async (request, response, next) => {
  try {
    const channels = await getChannels();
    const index = channels.findIndex((c) => c.id === request.params.id);
    if (index < 0) {
      response.status(404).json({ ok: false, error: 'Channel not found' });
      return;
    }

    channels[index] = { ...channels[index], isFavorite: !channels[index].isFavorite };
    await saveChannels(channels);
    response.json(channels[index]);
  } catch (error) {
    next(error);
  }
});
