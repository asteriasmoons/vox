import { app } from './app.js';
import { env } from './utils/env.js';

import { registerTelegramCommands } from "./bot/telegramCommands.js";
import { getTelegramClient } from './bot/telegramClient.js';
import { requirePublicAppUrl } from './utils/env.js';

async function bootstrap(): Promise<void> {
  await registerTelegramCommands();

  const bot = getTelegramClient();

  await bot.setWebHook(
    `${requirePublicAppUrl()}/api/telegram/webhook`
  );

  app.listen(env.port, () => {
    console.log(`Vox backend running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start Vox:', error);
  process.exit(1);
});
