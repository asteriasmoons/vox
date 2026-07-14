import { Router } from 'express';
import { deleteChannel, getChannels, saveChannel, saveChannels, setDefaultChannel } from '../services/channelService.js';
import { getTelegramClient } from '../bot/telegramClient.js';
import type { Channel } from '../types/post.js';

const AVATAR_COLORS = [
  '#8000fe', '#e019d4', '#00dbff', '#10b981', '#f59e0b',
  '#ec4899', '#6366f1', '#3b82f6', '#a855f7', '#fb923c'
];

function pickColor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const channelsRouter = Router();

// GET / — list all saved channels
channelsRouter.get('/', async (request, response, next) => {
  try {
    const channels = await getChannels();

    const { search, sort } = request.query;
    let result = [...channels];

    if (search) {
      const q = (search as string).toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.username ?? '').toLowerCase().includes(q)
      );
    }

    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'members') result.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));

    response.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /discover — look up a channel by @username or chat ID via Telegram Bot API
channelsRouter.post('/discover', async (request, response, next) => {
  try {
    const { identifier } = request.body as { identifier?: string };
    if (!identifier || !identifier.trim()) {
      response.status(400).json({ ok: false, error: 'Provide a channel @username or chat ID' });
      return;
    }

    const bot = getTelegramClient();
    const lookup = identifier.trim().startsWith('-') ? Number(identifier.trim()) : identifier.trim();

    let chat;
    try {
      chat = await bot.getChat(lookup);
    } catch {
      response.status(404).json({ ok: false, error: 'Channel not found. Make sure the bot has been added as an admin.' });
      return;
    }

    if (chat.type !== 'channel' && chat.type !== 'supergroup' && chat.type !== 'group') {
      response.status(400).json({ ok: false, error: 'Not a channel or group.' });
      return;
    }

    let memberCount: number | undefined;
    try {
      memberCount = await bot.getChatMemberCount(chat.id);
    } catch { /* not critical */ }

    const channel: Channel = {
      id: String(chat.id),
      name: chat.title ?? 'Untitled',
      telegramChatId: String(chat.id),
      username: ('username' in chat && chat.username) ? chat.username : undefined,
      description: ('description' in chat && chat.description) ? chat.description as string : undefined,
      memberCount,
      avatarColor: pickColor(String(chat.id)),
      connectedAt: new Date().toISOString()
    };

    // Save it
    const existing = await getChannels();
    const alreadyExists = existing.find(c => c.telegramChatId === channel.telegramChatId);
    if (!alreadyExists) {
      await saveChannel(channel);
    } else {
      // Update with fresh data
      const updated = { ...alreadyExists, ...channel, id: alreadyExists.id, isDefault: alreadyExists.isDefault, isFavorite: alreadyExists.isFavorite };
      await saveChannel(updated);
    }

    response.json(channel);
  } catch (error) {
    next(error);
  }
});

// POST /refresh — refresh all saved channels with latest Telegram data
channelsRouter.post('/refresh', async (_request, response, next) => {
  try {
    const channels = await getChannels();
    const bot = getTelegramClient();
    const updated: Channel[] = [];

    for (const ch of channels) {
      try {
        const chat = await bot.getChat(Number(ch.telegramChatId) || ch.telegramChatId);
        let memberCount: number | undefined;
        try { memberCount = await bot.getChatMemberCount(chat.id); } catch { /* */ }

        updated.push({
          ...ch,
          name: chat.title ?? ch.name,
          username: ('username' in chat && chat.username) ? chat.username : ch.username,
          description: ('description' in chat && chat.description) ? chat.description as string : ch.description,
          memberCount: memberCount ?? ch.memberCount
        });
      } catch {
        // Bot was removed or channel deleted — keep existing data
        updated.push(ch);
      }
    }

    await saveChannels(updated);
    response.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST / — manually add a channel
channelsRouter.post('/', async (request, response, next) => {
  try {
    const channel = request.body as Channel;
    if (!channel.id) channel.id = channel.telegramChatId || String(Date.now());
    if (!channel.avatarColor) channel.avatarColor = pickColor(channel.id);
    if (!channel.connectedAt) channel.connectedAt = new Date().toISOString();

    const result = await saveChannel(channel);
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /:id
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

// DELETE /:id
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

// PUT /:id/default
channelsRouter.put('/:id/default', async (request, response, next) => {
  try {
    const channels = await setDefaultChannel(request.params.id);
    response.json(channels);
  } catch (error) {
    next(error);
  }
});

// PUT /:id/favorite
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
