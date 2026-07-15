import type TelegramBot from 'node-telegram-bot-api';
import { defaultChannelUsernames } from '../config/defaultChannels.js';
import { getTelegramClient } from '../bot/telegramClient.js';
import type { Channel, ChannelPhoto } from '../types/post.js';
import { readJsonFile, writeJsonFile } from './storageService.js';

const fileName = 'channels.json';
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 30;

const AVATAR_COLORS = [
  '#8000fe',
  '#e019d4',
  '#00dbff',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#6366f1',
  '#3b82f6',
  '#a855f7',
  '#fb923c',
];

interface StoredChannel extends Channel {
  defaultUsername?: string;
  resolvedAt?: string;
}

export type ChannelInputErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'not_channel'
  | 'bot_inaccessible'
  | 'duplicate'
  | 'telegram_api_failure';

export class ChannelInputError extends Error {
  constructor(
    public readonly code: ChannelInputErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export async function getChannels(options: { forceRefresh?: boolean } = {}): Promise<Channel[]> {
  const stored = await readStoredChannels();
  const defaultChannels = await resolveDefaultChannels(stored, options.forceRefresh === true);
  const manualChannels = stored.filter((channel) => channel.source !== 'default');
  const combined = dedupeChannels([...defaultChannels, ...manualChannels]);

  await saveStoredChannels(mergeStoredChannels(stored, combined));
  return sortChannels(combined);
}

export async function getChannelById(channelId: string): Promise<Channel | undefined> {
  const channels = await getChannels();
  return channels.find((channel) => channel.id === channelId);
}

export async function getChannelPhotoFileId(channelId: string): Promise<string | undefined> {
  const channels = await getChannels();
  const channel = channels.find((item) => item.id === channelId);
  return channel?.photo?.bigFileId ?? channel?.photo?.smallFileId;
}

export async function saveChannels(channels: Channel[]): Promise<Channel[]> {
  await saveStoredChannels(channels.map((channel) => ({ ...channel })));
  return channels;
}

export async function saveChannel(channel: Channel): Promise<Channel> {
  const stored = await readStoredChannels();
  const normalized = normalizeStoredChannel(channel);
  const withoutDuplicate = stored.filter((item) => !isSameChannel(item, normalized));
  await saveStoredChannels([normalized, ...withoutDuplicate]);
  return normalized;
}

export async function addManualChannel(input: string): Promise<Channel> {
  const lookup = normalizeLookupInput(input);
  const existing = await getChannels();
  const bot = getTelegramClient();
  const resolved = await resolveChannelFromTelegram(bot, lookup, 'manual');

  if (existing.some((channel) => isSameChannel(channel, resolved))) {
    throw new ChannelInputError('duplicate', 'This channel is already connected.', 409);
  }

  if (!resolved.botCanAccess) {
    throw new ChannelInputError('bot_inaccessible', 'The bot cannot access this channel. Add it as an admin, then try again.', 403);
  }

  const stored = await readStoredChannels();
  await saveStoredChannels([resolved, ...stored]);
  return resolved;
}

export async function deleteChannel(id: string): Promise<boolean> {
  const stored = await readStoredChannels();
  const channel = stored.find((item) => item.id === id);

  if (!channel || channel.source === 'default') {
    return false;
  }

  await saveStoredChannels(stored.filter((item) => item.id !== id));
  return true;
}

export async function setDefaultChannel(id: string): Promise<Channel[]> {
  const channels = await getChannels();
  const updated = channels.map((channel) => ({
    ...channel,
    isDefault: channel.id === id,
  }));

  await saveStoredChannels(mergeStoredChannels(await readStoredChannels(), updated));
  return updated;
}

function normalizeStoredChannel(channel: Channel): StoredChannel {
  return {
    ...channel,
    id: channel.id || channel.telegramChatId,
    telegramChatId: channel.telegramChatId || channel.id,
    username: normalizeUsername(channel.username),
    source: channel.source ?? 'manual',
    avatarColor: channel.avatarColor ?? pickColor(channel.id || channel.telegramChatId || channel.username || channel.name),
  };
}

async function resolveDefaultChannels(stored: StoredChannel[], forceRefresh: boolean): Promise<StoredChannel[]> {
  const bot = getTelegramClient();
  const resolved: StoredChannel[] = [];

  for (const username of defaultChannelUsernames) {
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) continue;

    const cached = stored.find(
      (channel) =>
        channel.source === 'default' &&
        (channel.defaultUsername === normalizedUsername || normalizeUsername(channel.username) === normalizedUsername),
    );

    if (cached && !forceRefresh && isFresh(cached.resolvedAt)) {
      resolved.push({
        ...cached,
        source: 'default',
        defaultUsername: normalizedUsername,
      });
      continue;
    }

    try {
      resolved.push(await resolveChannelFromTelegram(bot, `@${normalizedUsername}`, 'default', normalizedUsername, cached));
    } catch (error) {
      resolved.push({
        ...(cached ?? createUnresolvedDefaultChannel(normalizedUsername)),
        source: 'default',
        defaultUsername: normalizedUsername,
        username: normalizedUsername,
        accessStatus: 'unresolved',
        botCanAccess: false,
        botIsAdmin: false,
        accessError: error instanceof Error ? error.message : 'Could not resolve default channel.',
        resolvedAt: new Date().toISOString(),
      });
    }
  }

  return resolved;
}

async function resolveChannelFromTelegram(
  bot: TelegramBot,
  lookup: string | number,
  source: 'default' | 'manual',
  defaultUsername?: string,
  previous?: StoredChannel,
): Promise<StoredChannel> {
  let chat: TelegramBot.Chat;

  try {
    chat = await bot.getChat(lookup);
  } catch (error) {
    throw getChatLookupError(error);
  }

  if (chat.type !== 'channel') {
    throw new ChannelInputError('not_channel', 'That Telegram chat is not a channel.', 400);
  }

  const access = await getBotAccess(bot, chat.id);
  const memberCount = await getMemberCount(bot, chat.id);
  const username = normalizeUsername(chat.username) ?? defaultUsername;
  const photo = mapPhoto(chat.photo);
  const id = String(chat.id);

  return {
    ...previous,
    id,
    name: chat.title ?? username ?? id,
    telegramChatId: id,
    username,
    description: chat.description,
    memberCount,
    source,
    isDefault: previous?.isDefault,
    isFavorite: previous?.isFavorite,
    connectedAt: previous?.connectedAt ?? new Date().toISOString(),
    avatarColor: previous?.avatarColor ?? pickColor(id),
    photo,
    photoUrl: photo ? `/api/channels/${encodeURIComponent(id)}/photo` : undefined,
    botCanAccess: access.botCanAccess,
    botIsAdmin: access.botIsAdmin,
    accessStatus: access.accessStatus,
    accessError: access.accessError,
    defaultUsername,
    resolvedAt: new Date().toISOString(),
  };
}

function getChatLookupError(error: unknown): ChannelInputError {
  const responseBody = getTelegramResponseBody(error);
  const description = responseBody?.description?.toLowerCase() ?? '';

  if (description.includes('chat not found') || description.includes('bad request')) {
    return new ChannelInputError(
      'not_found',
      'Channel not found. Make sure the username or numeric ID is correct and the bot can access it.',
      404,
    );
  }

  return new ChannelInputError(
    'telegram_api_failure',
    responseBody?.description ?? 'Telegram could not verify this channel right now.',
    502,
  );
}

function getTelegramResponseBody(error: unknown): { description?: string } | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const maybeResponse = error as { response?: { body?: { description?: string } } };
  return maybeResponse.response?.body;
}

async function getBotAccess(bot: TelegramBot, chatId: number): Promise<Pick<Channel, 'botCanAccess' | 'botIsAdmin' | 'accessStatus' | 'accessError'>> {
  try {
    const me = await bot.getMe();
    const member = await bot.getChatMember(chatId, me.id);
    const botIsAdmin = member.status === 'administrator' || member.status === 'creator';

    return {
      botCanAccess: true,
      botIsAdmin,
      accessStatus: botIsAdmin ? 'admin' : 'not_admin',
    };
  } catch (error) {
    return {
      botCanAccess: false,
      botIsAdmin: false,
      accessStatus: 'inaccessible',
      accessError: 'The bot cannot verify access to this channel.',
    };
  }
}

async function getMemberCount(bot: TelegramBot, chatId: number): Promise<number | undefined> {
  try {
    return await bot.getChatMemberCount(chatId);
  } catch {
    return undefined;
  }
}

function createUnresolvedDefaultChannel(username: string): StoredChannel {
  return {
    id: `default:${username}`,
    name: `@${username}`,
    telegramChatId: '',
    username,
    source: 'default',
    defaultUsername: username,
    avatarColor: pickColor(username),
    botCanAccess: false,
    botIsAdmin: false,
    accessStatus: 'unresolved',
    connectedAt: new Date().toISOString(),
  };
}

function normalizeLookupInput(input: string): string | number {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new ChannelInputError('invalid_input', 'Enter a public username or numeric channel ID.', 400);
  }

  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const username = normalizeUsername(trimmed);

  if (!username || !/^[a-zA-Z0-9_]{5,32}$/.test(username)) {
    throw new ChannelInputError('invalid_input', 'Enter a valid Telegram channel username or numeric channel ID.', 400);
  }

  return `@${username}`;
}

function normalizeUsername(username: string | undefined): string | undefined {
  const normalized = username?.trim().replace(/^@/, '').toLowerCase();
  return normalized || undefined;
}

function mapPhoto(photo: TelegramBot.ChatPhoto | undefined): ChannelPhoto | undefined {
  if (!photo) return undefined;

  return {
    smallFileId: photo.small_file_id,
    smallFileUniqueId: photo.small_file_unique_id,
    bigFileId: photo.big_file_id,
    bigFileUniqueId: photo.big_file_unique_id,
  };
}

function dedupeChannels(channels: StoredChannel[]): StoredChannel[] {
  const result: StoredChannel[] = [];

  for (const channel of channels) {
    const duplicateIndex = result.findIndex((item) => isSameChannel(item, channel));

    if (duplicateIndex === -1) {
      result.push(channel);
      continue;
    }

    const existing = result[duplicateIndex];
    result[duplicateIndex] = existing.source === 'default'
      ? { ...channel, ...existing, isFavorite: channel.isFavorite ?? existing.isFavorite }
      : { ...existing, ...channel, isFavorite: existing.isFavorite ?? channel.isFavorite };
  }

  return result;
}

function isSameChannel(a: Channel, b: Channel): boolean {
  const aChatId = normalizeChatId(a.telegramChatId || a.id);
  const bChatId = normalizeChatId(b.telegramChatId || b.id);
  const aUsername = normalizeUsername(a.username);
  const bUsername = normalizeUsername(b.username);

  return Boolean(
    (aChatId && bChatId && aChatId === bChatId) ||
    (aUsername && bUsername && aUsername === bUsername),
  );
}

function normalizeChatId(value: string | undefined): string | undefined {
  if (!value || value.startsWith('default:')) return undefined;
  return value.trim();
}

function mergeStoredChannels(existing: StoredChannel[], combined: StoredChannel[]): StoredChannel[] {
  const manualOnly = existing.filter(
    (stored) => stored.source !== 'default' && !combined.some((channel) => channel.source !== 'default' && isSameChannel(stored, channel)),
  );

  return dedupeChannels([...combined.map((channel) => ({ ...channel })), ...manualOnly]);
}

function sortChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'default' ? -1 : 1;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return displayName(a).localeCompare(displayName(b));
  });
}

function displayName(channel: Channel): string {
  return channel.name || channel.username || channel.telegramChatId || channel.id;
}

function isFresh(resolvedAt: string | undefined): boolean {
  if (!resolvedAt) return false;
  return Date.now() - new Date(resolvedAt).getTime() < DEFAULT_CACHE_TTL_MS;
}

function pickColor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

async function readStoredChannels(): Promise<StoredChannel[]> {
  return readJsonFile<StoredChannel[]>(fileName, []);
}

async function saveStoredChannels(channels: StoredChannel[]): Promise<void> {
  await writeJsonFile(fileName, channels);
}
