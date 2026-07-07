import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  miniappOrigin: process.env.MINIAPP_ORIGIN ?? 'http://localhost:5173',
  publicAppUrl: process.env.PUBLIC_APP_URL ?? ''
};

export function requireTelegramToken(): string {
  if (!env.telegramBotToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN in backend/.env');
  }

  return env.telegramBotToken;
}

export function requirePublicAppUrl(): string {
  if (!env.publicAppUrl) {
    throw new Error('Missing PUBLIC_APP_URL in backend/.env');
  }

  return env.publicAppUrl;
}
