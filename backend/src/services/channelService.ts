import type { Channel } from '../types/post.js';
import { readJsonFile, writeJsonFile } from './storageService.js';

const fileName = 'channels.json';

export async function getChannels(): Promise<Channel[]> {
  return readJsonFile<Channel[]>(fileName, []);
}

export async function getChannelById(channelId: string): Promise<Channel | undefined> {
  const channels = await getChannels();
  return channels.find((channel) => channel.id === channelId);
}

export async function saveChannels(channels: Channel[]): Promise<Channel[]> {
  await writeJsonFile(fileName, channels);
  return channels;
}

export async function saveChannel(channel: Channel): Promise<Channel> {
  const channels = await getChannels();
  const index = channels.findIndex((item) => item.id === channel.id);
  if (index >= 0) channels[index] = channel;
  else channels.unshift(channel);

  await writeJsonFile(fileName, channels);
  return channel;
}

export async function deleteChannel(id: string): Promise<boolean> {
  const channels = await getChannels();
  const index = channels.findIndex((item) => item.id === id);
  if (index < 0) return false;

  channels.splice(index, 1);
  await writeJsonFile(fileName, channels);
  return true;
}

export async function setDefaultChannel(id: string): Promise<Channel[]> {
  const channels = await getChannels();
  const updated = channels.map((channel) => ({
    ...channel,
    isDefault: channel.id === id
  }));

  await writeJsonFile(fileName, updated);
  return updated;
}
