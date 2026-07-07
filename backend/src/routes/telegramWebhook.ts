import { Router } from "express";
import TelegramBot from "node-telegram-bot-api";
import { getTelegramClient } from "../bot/telegramClient.js";

export const telegramWebhookRouter = Router();

telegramWebhookRouter.post("/webhook", async (request, response) => {
  try {
    const bot = getTelegramClient();

    // Pass the incoming Telegram update to the bot.
    bot.processUpdate(request.body as TelegramBot.Update);

    response.sendStatus(200);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    response.sendStatus(500);
  }
});
