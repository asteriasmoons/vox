import TelegramBot from 'node-telegram-bot-api';
import { requireTelegramToken } from '../utils/env.js';

let client: TelegramBot | null = null;

export function getTelegramClient(): TelegramBot {
  if (!client) {
    client = new TelegramBot(requireTelegramToken(), { polling: false });
  }

  return client;
}
