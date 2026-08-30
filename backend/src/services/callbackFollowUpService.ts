import type { CallbackFollowUp } from '../types/post.js';
import { readJsonFile, writeJsonFile } from './storageService.js';

/**
 * Every callback-data rich button whose "Callback Response" is enabled at
 * publish time gets an entry in this map, so the callback-query handler
 * can look up what to send back and where. The key is scoped to the chat
 * the rich message was published into, so the same callback_data can be
 * used across posts in different channels without collision.
 *
 * Shape on disk:
 * {
 *   "-1001234567890:go_dm": {
 *     "enabled": true, "destination": "dm",
 *     "text": "Thanks for opting in!", "parseMode": "HTML"
 *   },
 *   ...
 * }
 */

const FILE = 'callbackFollowUps.json';

type FollowUpMap = Record<string, CallbackFollowUp>;

function makeKey(chatId: number | string, callbackData: string): string {
  return `${String(chatId)}:${callbackData}`;
}

export async function registerCallbackFollowUp(
  chatId: number | string,
  callbackData: string,
  followUp: CallbackFollowUp
): Promise<void> {
  const map = await readJsonFile<FollowUpMap>(FILE, {});
  map[makeKey(chatId, callbackData)] = followUp;
  await writeJsonFile(FILE, map);
}

export async function lookupCallbackFollowUp(
  chatId: number | string,
  callbackData: string
): Promise<CallbackFollowUp | undefined> {
  const map = await readJsonFile<FollowUpMap>(FILE, {});
  return map[makeKey(chatId, callbackData)];
}

export async function unregisterCallbackFollowUp(
  chatId: number | string,
  callbackData: string
): Promise<void> {
  const map = await readJsonFile<FollowUpMap>(FILE, {});
  delete map[makeKey(chatId, callbackData)];
  await writeJsonFile(FILE, map);
}
