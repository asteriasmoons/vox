import { Router } from 'express';
import { getChannels, saveChannels } from '../services/channelService.js';
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

channelsRouter.get('/', async (_request, response, next) => {
  try {
    const channels = await getChannels();
    const fallbackChannel = getFallbackChannel();

    if (channels.length === 0 && fallbackChannel) {
      response.json([fallbackChannel]);
      return;
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
