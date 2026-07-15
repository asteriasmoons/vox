import type { InlineButtonRows, PostPayload } from '../types/post.js';
import { getChannelById } from '../services/channelService.js';
import { getTelegramClient } from './telegramClient.js';

function toReplyMarkup(buttons: InlineButtonRows) {
  const inlineKeyboard = buttons
    .map((row) => row.filter((button) => button.text.trim() && button.url.trim()))
    .filter((row) => row.length > 0);

  return inlineKeyboard.length ? { inline_keyboard: inlineKeyboard } : undefined;
}

export async function publishPostToTelegram(post: PostPayload): Promise<number> {
  const channel = await getChannelById(post.channelId);

  if (!channel) {
    throw new Error(`Channel not found for id: ${post.channelId}`);
  }

  if (!channel.telegramChatId || !channel.botCanAccess) {
    throw new Error(`The bot cannot publish to channel: ${channel.username ? `@${channel.username}` : channel.name}`);
  }

  const bot = getTelegramClient();
  const message = await bot.sendMessage(Number(channel.telegramChatId), post.text, {
    parse_mode: post.parseMode,
    reply_markup: toReplyMarkup(post.buttons),
    disable_web_page_preview: false
  });

  return message.message_id;
}
