import type {
  InlineButton,
  InlineButtonRows,
  InputMedia,
  PostPayload,
  RichBlock,
  RichBlockCaption,
  RichBlockTableCell,
  RichListItem,
  RichMediaRef,
  RichMessage,
  RichMessageButton
} from '../types/post.js';
import { getChannelById } from '../services/channelService.js';
import { getTelegramClient } from './telegramClient.js';
import { requireTelegramToken } from '../utils/env.js';

// ─── Public API ───────────────────────────────────────────────────────────────

export async function publishPostToTelegram(post: PostPayload): Promise<number> {
  const channel = await getChannelById(post.channelId);

  if (!channel) {
    throw new Error(`Channel not found for id: ${post.channelId}`);
  }

  if (!channel.telegramChatId || !channel.botCanAccess) {
    throw new Error(`The bot cannot publish to channel: ${channel.username ? `@${channel.username}` : channel.name}`);
  }

  const chatId = Number(channel.telegramChatId);
  if (post.mode === 'rich') {
    if (!post.rich) throw new Error('Rich mode selected but the payload is missing `rich`.');
    return sendRichMessage(chatId, post.rich, post.buttons);
  }
  return sendRegularMessage(chatId, post);
}

// ─── Regular sendMessage path (unchanged behaviour) ───────────────────────────

async function sendRegularMessage(chatId: number, post: PostPayload): Promise<number> {
  const bot = getTelegramClient();
  // Cast the options: node-telegram-bot-api's InlineKeyboardButton predates
  // Bot API 10.3 and doesn't type callback_data / web_app / login_url / etc.
  // loosely enough. toReplyMarkup already emits shapes Telegram accepts.
  const message = await bot.sendMessage(chatId, post.text, {
    parse_mode: post.parseMode,
    reply_markup: toReplyMarkup(post.buttons),
    disable_web_page_preview: false
  } as unknown as Parameters<typeof bot.sendMessage>[2]);
  return message.message_id;
}

// ─── Rich sendRichMessage path (Bot API 10.3) ─────────────────────────────────

async function sendRichMessage(chatId: number, rich: RichMessage, buttons: InlineButtonRows): Promise<number> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    rich_message: toInputRichMessage(rich)
  };
  const replyMarkup = toReplyMarkup(buttons);
  if (replyMarkup) body.reply_markup = replyMarkup;

  const response = await callBotApi('sendRichMessage', body);
  const messageId = (response as { result?: { message_id?: number } }).result?.message_id;
  if (typeof messageId !== 'number') {
    throw new Error('Telegram did not return a message_id for sendRichMessage.');
  }
  return messageId;
}

async function callBotApi(method: string, body: Record<string, unknown>): Promise<unknown> {
  const token = requireTelegramToken();
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description ?? res.statusText}`);
  }
  return json;
}

// ─── InputRichMessage builder (frontend camelCase → Bot API snake_case) ───────

function toInputRichMessage(rich: RichMessage): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // Exactly one of html / markdown / blocks must be present per the API.
  if (rich.flavor === 'html') out.html = rich.html ?? '';
  else if (rich.flavor === 'markdown') out.markdown = rich.markdown ?? '';
  else out.blocks = (rich.blocks ?? []).map(toInputRichBlock);
  if (rich.media && rich.media.length > 0) out.media = rich.media.map(toInputRichMessageMedia);
  if (rich.isRtl) out.is_rtl = true;
  if (rich.skipEntityDetection) out.skip_entity_detection = true;
  return out;
}

function toInputRichMessageMedia(ref: RichMediaRef): Record<string, unknown> {
  return {
    id: ref.id,
    media: toInputMedia(ref.media)
  };
}

function toInputMedia(media: InputMedia): Record<string, unknown> {
  const out: Record<string, unknown> = {
    type: media.type,
    media: media.media
  };
  if (media.caption != null) out.caption = media.caption;
  if (media.parseMode) out.parse_mode = media.parseMode;
  if (media.showCaptionAboveMedia) out.show_caption_above_media = true;

  switch (media.type) {
    case 'photo':
      if (media.hasSpoiler) out.has_spoiler = true;
      break;
    case 'video':
      if (media.thumbnail) out.thumbnail = media.thumbnail;
      if (media.cover) out.cover = media.cover;
      if (media.startTimestamp != null) out.start_timestamp = media.startTimestamp;
      if (media.width != null) out.width = media.width;
      if (media.height != null) out.height = media.height;
      if (media.duration != null) out.duration = media.duration;
      if (media.supportsStreaming) out.supports_streaming = true;
      if (media.hasSpoiler) out.has_spoiler = true;
      break;
    case 'animation':
      if (media.thumbnail) out.thumbnail = media.thumbnail;
      if (media.width != null) out.width = media.width;
      if (media.height != null) out.height = media.height;
      if (media.duration != null) out.duration = media.duration;
      if (media.hasSpoiler) out.has_spoiler = true;
      break;
    case 'audio':
      if (media.thumbnail) out.thumbnail = media.thumbnail;
      if (media.duration != null) out.duration = media.duration;
      if (media.performer) out.performer = media.performer;
      if (media.title) out.title = media.title;
      break;
    case 'document':
      if (media.thumbnail) out.thumbnail = media.thumbnail;
      if (media.disableContentTypeDetection) out.disable_content_type_detection = true;
      break;
    case 'voice_note':
      if (media.duration != null) out.duration = media.duration;
      break;
  }
  return out;
}

function toInputRichBlock(block: RichBlock): Record<string, unknown> {
  switch (block.type) {
    case 'paragraph': return { type: 'paragraph', text: toRichText(block.text) };
    case 'heading': return { type: 'heading', text: toRichText(block.text), size: block.size };
    case 'pre': return { type: 'pre', text: toRichText(block.text), ...(block.language ? { language: block.language } : {}) };
    case 'footer': return { type: 'footer', text: toRichText(block.text) };
    case 'divider': return { type: 'divider' };
    case 'mathematical_expression': return { type: 'mathematical_expression', expression: block.expression };
    case 'anchor': return { type: 'anchor', name: block.name };
    case 'list': return {
      type: 'list',
      ordered: block.ordered,
      items: block.items.map(toInputRichBlockListItem)
    };
    case 'blockquote': {
      const out: Record<string, unknown> = { type: 'blockquote', blocks: block.blocks.map(toInputRichBlock) };
      if (block.credit) out.credit = toRichText(block.credit);
      return out;
    }
    case 'expandable_blockquote': {
      const out: Record<string, unknown> = { type: 'expandable_blockquote', text: toRichText(block.text) };
      if (block.credit) out.credit = toRichText(block.credit);
      return out;
    }
    case 'pullquote': {
      const out: Record<string, unknown> = { type: 'pullquote', text: toRichText(block.text) };
      if (block.credit) out.credit = toRichText(block.credit);
      return out;
    }
    case 'collage':
    case 'slideshow': {
      const out: Record<string, unknown> = { type: block.type, blocks: block.blocks.map(toInputRichBlock) };
      if (block.caption) out.caption = toRichBlockCaption(block.caption);
      return out;
    }
    case 'table': {
      const out: Record<string, unknown> = {
        type: 'table',
        cells: block.cells.map((row) => row.map(toRichBlockTableCell))
      };
      if (block.isBordered) out.is_bordered = true;
      if (block.isStriped) out.is_striped = true;
      if (block.isCompact) out.is_compact = true;
      if (block.caption) out.caption = toRichText(block.caption);
      return out;
    }
    case 'details': {
      const out: Record<string, unknown> = {
        type: 'details',
        summary: toRichText(block.summary),
        blocks: block.blocks.map(toInputRichBlock)
      };
      if (block.isOpen) out.is_open = true;
      return out;
    }
    case 'map': {
      const out: Record<string, unknown> = {
        type: 'map',
        location: { latitude: block.latitude, longitude: block.longitude }
      };
      if (block.zoom != null) out.zoom = block.zoom;
      if (block.width != null) out.width = block.width;
      if (block.height != null) out.height = block.height;
      if (block.caption) out.caption = toRichBlockCaption(block.caption);
      return out;
    }
    case 'buttons': {
      const out: Record<string, unknown> = {
        type: 'buttons',
        buttons: block.buttons.map(toRichMessageButton)
      };
      if (block.align) out.align = block.align;
      return out;
    }
    case 'photo': return { type: 'photo', photo: toInputMedia(block.photo), ...(block.caption ? { caption: toRichBlockCaption(block.caption) } : {}) };
    case 'video': return { type: 'video', video: toInputMedia(block.video), ...(block.caption ? { caption: toRichBlockCaption(block.caption) } : {}) };
    case 'animation': return { type: 'animation', animation: toInputMedia(block.animation), ...(block.caption ? { caption: toRichBlockCaption(block.caption) } : {}) };
    case 'audio': return { type: 'audio', audio: toInputMedia(block.audio), ...(block.caption ? { caption: toRichBlockCaption(block.caption) } : {}) };
    case 'document': return { type: 'document', document: toInputMedia(block.document), ...(block.caption ? { caption: toRichBlockCaption(block.caption) } : {}) };
    case 'voice_note': return { type: 'voice_note', voice_note: toInputMedia(block.voiceNote), ...(block.caption ? { caption: toRichBlockCaption(block.caption) } : {}) };
    case 'thinking': return { type: 'thinking', text: toRichText(block.text) };
  }
}

function toInputRichBlockListItem(item: RichListItem): Record<string, unknown> {
  const out: Record<string, unknown> = { blocks: item.blocks.map(toInputRichBlock) };
  if (item.hasCheckbox) out.has_checkbox = true;
  if (item.isChecked) out.is_checked = true;
  if (item.value != null) out.value = item.value;
  if (item.labelType) out.label_type = item.labelType;
  return out;
}

function toRichBlockTableCell(cell: RichBlockTableCell): Record<string, unknown> {
  const out: Record<string, unknown> = {
    align: cell.align,
    valign: cell.valign
  };
  if (cell.text != null) out.text = toRichText(cell.text);
  if (cell.isHeader) out.is_header = true;
  if (cell.colspan && cell.colspan > 1) out.colspan = cell.colspan;
  if (cell.rowspan && cell.rowspan > 1) out.rowspan = cell.rowspan;
  return out;
}

function toRichBlockCaption(caption: RichBlockCaption): Record<string, unknown> {
  const out: Record<string, unknown> = { text: toRichText(caption.text) };
  if (caption.credit) out.credit = toRichText(caption.credit);
  return out;
}

function toRichMessageButton(button: RichMessageButton): Record<string, unknown> {
  const out: Record<string, unknown> = { text: toRichText(button.text) };
  if (button.style) out.style = button.style;
  switch (button.kind) {
    case 'url':
      if (button.url) out.url = button.url;
      break;
    case 'callback_data':
      if (button.callbackData) out.callback_data = button.callbackData;
      break;
    case 'web_app':
      if (button.webAppUrl) out.web_app = { url: button.webAppUrl };
      break;
    case 'login_url':
      if (button.loginUrl) out.login_url = { url: button.loginUrl };
      break;
    case 'switch_inline_query':
      out.switch_inline_query = button.switchInlineQuery ?? '';
      break;
    case 'switch_inline_query_current_chat':
      out.switch_inline_query_current_chat = button.switchInlineQueryCurrentChat ?? '';
      break;
    case 'copy_text':
      if (button.copyText) out.copy_text = { text: button.copyText };
      break;
    case 'pay':
      out.pay = true;
      break;
  }
  return out;
}

/**
 * Telegram's RichText is either a plain string, an array of RichText, or
 * a typed object. The editor keeps plain strings, which are valid RichText.
 */
function toRichText(text: string): string {
  return text ?? '';
}

// ─── reply_markup (used by both modes) ────────────────────────────────────────

function toReplyMarkup(buttons: InlineButtonRows) {
  const inlineKeyboard = buttons
    .map((row) => row.map(toInlineKeyboardButton).filter((b): b is Record<string, unknown> => b != null))
    .filter((row) => row.length > 0);
  return inlineKeyboard.length ? { inline_keyboard: inlineKeyboard } : undefined;
}

function toInlineKeyboardButton(button: InlineButton): Record<string, unknown> | null {
  const text = button.text?.trim();
  if (!text) return null;
  const kind = button.kind ?? 'url';
  const out: Record<string, unknown> = { text };
  switch (kind) {
    case 'url': {
      const url = (button.url ?? '').trim();
      if (!url) return null;
      out.url = url;
      return out;
    }
    case 'callback_data':
      if (!button.callbackData) return null;
      out.callback_data = button.callbackData;
      return out;
    case 'web_app':
      if (!button.webAppUrl) return null;
      out.web_app = { url: button.webAppUrl };
      return out;
    case 'login_url':
      if (!button.loginUrl) return null;
      out.login_url = { url: button.loginUrl };
      return out;
    case 'switch_inline_query':
      out.switch_inline_query = button.switchInlineQuery ?? '';
      return out;
    case 'switch_inline_query_current_chat':
      out.switch_inline_query_current_chat = button.switchInlineQueryCurrentChat ?? '';
      return out;
    case 'copy_text':
      if (!button.copyText) return null;
      out.copy_text = { text: button.copyText };
      return out;
    case 'pay':
      out.pay = true;
      return out;
    default:
      return null;
  }
}
