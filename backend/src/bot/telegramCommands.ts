import type TelegramBot from "node-telegram-bot-api";
import { getTelegramClient } from "./telegramClient.js";

function formatChatIdResponse(chat: TelegramBot.Chat): string {
  const username =
    "username" in chat && chat.username ? `@${chat.username}` : "No username";

  return [
    "Channel found:",
    "",
    `Title: ${chat.title ?? "Untitled"}`,
    `Username: ${username}`,
    `Channel ID: ${chat.id}`,
    "",
    "Use this in your backend .env:",
    "",
    `TELEGRAM_DEFAULT_CHANNEL_ID=${chat.id}`,
    `TELEGRAM_DEFAULT_CHANNEL_NAME=${chat.title ?? "Default Telegram Channel"}`,
  ].join("\n");
}

export async function registerTelegramCommands(): Promise<void> {
  const bot = getTelegramClient();

  await bot.setMyCommands([
    {
      command: "start",
      description: "Start Vox",
    },
    {
      command: "channel",
      description: "Get a Telegram channel ID",
    },
  ]);

  bot.onText(/^\/start$/, async (message) => {
    await bot.sendMessage(
      message.chat.id,
      [
        "Welcome to Vox.",
        "",
        "Vox helps you draft, preview, and publish Telegram channel announcements.",
        "",
        "Commands:",
        "/start - Show this message",
        "/channel @yourchannel - Get a channel ID",
        "",
        "Example:",
        "/channel @voxupdates",
      ].join("\n"),
    );
  });

  bot.onText(/^\/channel(?:\s+(.+))?$/, async (message, match) => {
    const input = match?.[1]?.trim();

    if (!input) {
      await bot.sendMessage(
        message.chat.id,
        [
          "Send the command with your public channel username.",
          "",
          "Example:",
          "/channel @voxupdates",
        ].join("\n"),
      );

      return;
    }

    const chatUsername = input.startsWith("@") ? input : `@${input}`;

    try {
      const chat = await bot.getChat(chatUsername);
      await bot.sendMessage(message.chat.id, formatChatIdResponse(chat));
    } catch {
      await bot.sendMessage(
        message.chat.id,
        [
          "I could not find that channel.",
          "",
          "Make sure:",
          "- The channel username is correct.",
          "- The channel is public.",
          "- The bot has been added to the channel as an admin.",
        ].join("\n"),
      );
    }
  });
}
