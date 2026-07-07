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
