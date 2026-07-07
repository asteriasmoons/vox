import { Router } from 'express';
import { getChannels, saveChannels } from '../services/channelService.js';
import type { Channel } from '../types/post.js';

export const channelsRouter = Router();

channelsRouter.get('/', async (_request, response, next) => {
  try {
    response.json(await getChannels());
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
