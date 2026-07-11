import { app } from './app.js';
import { env } from './utils/env.js';

import { registerTelegramCommands } from "./bot/telegramCommands.js";
import { getTelegramClient } from './bot/telegramClient.js';
import { requirePublicAppUrl } from './utils/env.js';

async function initializeTelegram(): Promise<void> {
  await registerTelegramCommands();

  const bot = getTelegramClient();

  await bot.setWebHook(
    `${requirePublicAppUrl()}/api/telegram/webhook`
  );
}

function bootstrap(): void {
  app.listen(env.port, () => {
    console.log(`Vox backend running on http://localhost:${env.port}`);

    initializeTelegram().catch((error) => {
      console.error('Failed to initialize Telegram integration:', error);
    });
  });
}

bootstrap();
