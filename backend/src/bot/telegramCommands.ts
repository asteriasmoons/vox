import type TelegramBot from "node-telegram-bot-api";
import { env } from "../utils/env.js";
import { lookupCallbackFollowUp } from "../services/callbackFollowUpService.js";
import { getTelegramClient } from "./telegramClient.js";

const COMMANDS: TelegramBot.BotCommand[] = [
  {
    command: "start",
    description: "Start Vox",
  },
  {
    command: "channel",
    description: "Get a Telegram channel ID",
  },
];

const COMMAND_SCOPES: TelegramBot.BotCommandScope[] = [
  { type: "default" },
  { type: "all_private_chats" },
  { type: "all_group_chats" },
  { type: "all_chat_administrators" },
];

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

function formatStartResponse(): string {
  return [
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
  ].join("\n");
}

function openVoxReplyMarkup(): TelegramBot.SendMessageOptions["reply_markup"] | undefined {
  if (!env.miniappOrigin) {
    return undefined;
  }

  return {
    inline_keyboard: [
      [
        {
          text: "Open Vox",
          web_app: { url: env.miniappOrigin },
        },
      ],
    ],
  };
}

function parseCommand(
  text: string | undefined,
  botUsername: string | null,
): { command: "start" | "channel"; input: string } | null {
  const match = text
    ?.trim()
    .match(/^\/(start|channel)(?:@([A-Za-z0-9_]+))?(?:\s+([\s\S]*))?$/i);

  if (!match) {
    return null;
  }

  const mention = match[2]?.toLowerCase();
  if (mention && (!botUsername || mention !== botUsername.toLowerCase())) {
    return null;
  }

  return {
    command: match[1].toLowerCase() as "start" | "channel",
    input: match[3]?.trim() ?? "",
  };
}

async function handleCommand(
  bot: TelegramBot,
  message: TelegramBot.Message,
  botUsername: string | null,
): Promise<void> {
  const parsed = parseCommand(message.text, botUsername);

  if (!parsed) {
    return;
  }

  if (parsed.command === "start") {
    await bot.sendMessage(message.chat.id, formatStartResponse(), {
      reply_markup: openVoxReplyMarkup(),
    });
    return;
  }

  if (!parsed.input) {
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

  const chatUsername = parsed.input.startsWith("@")
    ? parsed.input
    : `@${parsed.input}`;

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
}

function inlineResultForQuery(query: string): TelegramBot.InlineQueryResultArticle {
  const trimmedQuery = query.trim();
  const title = trimmedQuery ? "Share this Vox draft" : "Open Vox";
  const messageText = trimmedQuery || "Create and publish Telegram announcements in Vox.";

  return {
    type: "article",
    id: trimmedQuery ? `vox-draft-${Buffer.from(trimmedQuery).toString("base64url")}` : "vox-open",
    title,
    description: trimmedQuery || "Draft, preview, and publish Telegram channel announcements.",
    input_message_content: {
      message_text: messageText,
      disable_web_page_preview: true,
    },
    ...(env.miniappOrigin
      ? {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Open Vox",
                  url: env.miniappOrigin,
                },
              ],
            ],
          },
        }
      : {}),
  };
}

export async function registerTelegramCommands(): Promise<void> {
  const bot = getTelegramClient();
  let botUsername: string | null = null;

  try {
    const me = await bot.getMe();
    botUsername = me.username ?? null;
  } catch (error) {
    console.warn("Could not resolve Telegram bot username:", error);
  }

  await Promise.all(
    COMMAND_SCOPES.map((scope) => bot.setMyCommands(COMMANDS, { scope })),
  );

  if (env.miniappOrigin) {
    await bot.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "Open Vox",
        web_app: { url: env.miniappOrigin },
      },
    });
  }

  bot.on("message", (message) => {
    void handleCommand(bot, message, botUsername);
  });

  bot.on("channel_post", (message) => {
    void handleCommand(bot, message, botUsername);
  });

  bot.on("inline_query", (query) => {
    void bot.answerInlineQuery(query.id, [inlineResultForQuery(query.query)], {
      cache_time: 0,
      is_personal: true,
      switch_pm_text: "Open Vox",
      switch_pm_parameter: "inline",
    });
  });

  bot.on("callback_query", (query) => {
    void handleCallbackQuery(bot, query);
  });
}

/**
 * When someone taps a rich-message callback button, look up whether that
 * button was configured with a follow-up response. If so, send it to the
 * right destination (the chat the rich message lives in, or the tapper's
 * DM). Regardless of outcome, answer the callback so the client stops
 * showing its loading state.
 */
async function handleCallbackQuery(bot: TelegramBot, query: TelegramBot.CallbackQuery): Promise<void> {
  const data = query.data;
  const messageChat = query.message?.chat;

  try {
    if (!data || !messageChat) {
      await bot.answerCallbackQuery(query.id);
      return;
    }

    const followUp = await lookupCallbackFollowUp(messageChat.id, data);
    if (!followUp?.enabled || !followUp.text.trim()) {
      // No configured response for this button — the callback still needs
      // an ack, but there's nothing to send.
      await bot.answerCallbackQuery(query.id);
      return;
    }

    const target = followUp.destination === "dm" ? query.from.id : messageChat.id;

    try {
      await bot.sendMessage(target, followUp.text, followUp.parseMode ? { parse_mode: followUp.parseMode } : undefined);
      await bot.answerCallbackQuery(query.id);
    } catch (sendError) {
      // Most common cause on DM: the user has never started a chat with the
      // bot, so Telegram refuses. Surface a short toast on the button.
      console.warn("Follow-up send failed:", sendError);
      const notice = followUp.destination === "dm"
        ? "Open a chat with the bot first so it can DM you."
        : "Could not send the follow-up message.";
      await bot.answerCallbackQuery(query.id, { text: notice, show_alert: true }).catch(() => undefined);
    }
  } catch (error) {
    console.error("callback_query handler failed:", error);
    try { await bot.answerCallbackQuery(query.id); } catch { /* nothing */ }
  }
}
