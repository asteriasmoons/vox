export type ParseMode = 'HTML';
export type PostStatus = 'draft' | 'scheduled' | 'posted';

// ─── Regular post inline buttons (reply_markup, extended in Bot API 10.3) ─────
// Backward-compatible with the previous {text, url} shape: `url` and
// `kind: 'url'` remain the defaults so pre-rich drafts still deserialize.

export type InlineButtonKind =
  | 'url'
  | 'callback_data'
  | 'web_app'
  | 'login_url'
  | 'switch_inline_query'
  | 'switch_inline_query_current_chat'
  | 'copy_text'
  | 'pay';

export interface InlineButton {
  text: string;
  /** Legacy URL — retained so pre-rich drafts still deserialize. */
  url: string;
  kind?: InlineButtonKind;
  callbackData?: string;
  webAppUrl?: string;
  loginUrl?: string;
  switchInlineQuery?: string;
  switchInlineQueryCurrentChat?: string;
  copyText?: string;
}

export type InlineButtonRows = InlineButton[][];

// ─── InputMedia* (Bot API) ────────────────────────────────────────────────────
// The subset of fields the editor exposes and the send layer forwards.

export interface InputMediaCommon {
  /** file_id, HTTP(S) URL, or attach://<name>. */
  media: string;
  caption?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  showCaptionAboveMedia?: boolean;
}

export interface InputMediaPhoto extends InputMediaCommon {
  type: 'photo';
  hasSpoiler?: boolean;
}

export interface InputMediaVideo extends InputMediaCommon {
  type: 'video';
  thumbnail?: string;
  cover?: string;
  startTimestamp?: number;
  width?: number;
  height?: number;
  duration?: number;
  supportsStreaming?: boolean;
  hasSpoiler?: boolean;
}

export interface InputMediaAnimation extends InputMediaCommon {
  type: 'animation';
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
  hasSpoiler?: boolean;
}

export interface InputMediaAudio extends InputMediaCommon {
  type: 'audio';
  thumbnail?: string;
  duration?: number;
  performer?: string;
  title?: string;
}

export interface InputMediaDocument extends InputMediaCommon {
  type: 'document';
  thumbnail?: string;
  disableContentTypeDetection?: boolean;
}

export interface InputMediaVoiceNote extends InputMediaCommon {
  type: 'voice_note';
  duration?: number;
}

export type InputMedia =
  | InputMediaPhoto
  | InputMediaVideo
  | InputMediaAnimation
  | InputMediaAudio
  | InputMediaDocument
  | InputMediaVoiceNote;

// ─── Rich Message (Bot API 10.3) ──────────────────────────────────────────────

export type RichFlavor = 'html' | 'markdown' | 'blocks';
export type RichButtonStyle = 'danger' | 'success' | 'primary' | 'link';

/**
 * Mirrors Telegram's RichMessageButton. `text` here is a plain string in the
 * editor; the send layer wraps it as RichText.
 */
export interface RichMessageButton {
  text: string;
  style?: RichButtonStyle;
  kind:
    | 'url'
    | 'callback_data'
    | 'web_app'
    | 'login_url'
    | 'switch_inline_query'
    | 'switch_inline_query_current_chat'
    | 'copy_text'
    | 'pay';
  url?: string;
  callbackData?: string;
  webAppUrl?: string;
  loginUrl?: string;
  switchInlineQuery?: string;
  switchInlineQueryCurrentChat?: string;
  copyText?: string;
}

/**
 * Caption of a rich formatted block (Telegram RichBlockCaption).
 * `text` is a plain string in the editor; the send layer promotes it to
 * RichText. `credit` corresponds to <cite>.
 */
export interface RichBlockCaption {
  text: string;
  credit?: string;
}

/**
 * Cell in a RichBlockTable. Mirrors Telegram's RichBlockTableCell:
 * optional text (omitted cell = invisible), header flag, colspan, rowspan,
 * horizontal and vertical alignment.
 */
export interface RichBlockTableCell {
  text?: string;
  isHeader?: boolean;
  colspan?: number;
  rowspan?: number;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
}

/**
 * Item of a rich list. Mirrors Telegram's InputRichBlockListItem:
 * blocks (content), optional checkbox state, optional ordered-list numeric
 * value and label type ('a' | 'A' | 'i' | 'I' | '1').
 */
export interface RichListItem {
  blocks: RichBlock[];
  hasCheckbox?: boolean;
  isChecked?: boolean;
  value?: number;
  labelType?: 'a' | 'A' | 'i' | 'I' | '1';
}

/**
 * Media element referenced from html/markdown flavors via
 *   tg://photo?id=… / tg://video?id=… / tg://document?id=… / tg://audio?id=…
 * `id` is 1–64 chars, [A-Za-z0-9_-]. The `media` field holds the full
 * InputMedia so each reference carries its own caption/spoiler/etc.
 */
export interface RichMediaRef {
  id: string;
  media: InputMedia;
}

/**
 * Discriminated union of every InputRichBlock* type. `type` matches the string
 * Telegram expects on the wire, exposed 1:1 (e.g. 'pre' for preformatted,
 * 'voice_note' for voice notes, 'mathematical_expression' for math).
 */
export type RichBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; size: 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'pre'; text: string; language?: string }
  | { type: 'footer'; text: string }
  | { type: 'divider' }
  | { type: 'mathematical_expression'; expression: string }
  | { type: 'anchor'; name: string }
  | { type: 'list'; ordered: boolean; items: RichListItem[] }
  | { type: 'blockquote'; blocks: RichBlock[]; credit?: string }
  | { type: 'expandable_blockquote'; text: string; credit?: string }
  | { type: 'pullquote'; text: string; credit?: string }
  | { type: 'collage'; blocks: RichBlock[]; caption?: RichBlockCaption }
  | { type: 'slideshow'; blocks: RichBlock[]; caption?: RichBlockCaption }
  | { type: 'table'; cells: RichBlockTableCell[][]; isBordered?: boolean; isStriped?: boolean; isCompact?: boolean; caption?: string }
  | { type: 'details'; summary: string; blocks: RichBlock[]; isOpen?: boolean }
  | { type: 'map'; latitude: number; longitude: number; zoom?: number; width?: number; height?: number; caption?: RichBlockCaption }
  | { type: 'buttons'; buttons: RichMessageButton[]; align?: 'left' | 'center' | 'right' }
  | { type: 'animation'; animation: InputMediaAnimation; caption?: RichBlockCaption }
  | { type: 'audio'; audio: InputMediaAudio; caption?: RichBlockCaption }
  | { type: 'document'; document: InputMediaDocument; caption?: RichBlockCaption }
  | { type: 'photo'; photo: InputMediaPhoto; caption?: RichBlockCaption }
  | { type: 'video'; video: InputMediaVideo; caption?: RichBlockCaption }
  | { type: 'voice_note'; voiceNote: InputMediaVoiceNote; caption?: RichBlockCaption }
  | { type: 'thinking'; text: string };

export interface RichMessage {
  flavor: RichFlavor;
  /** Used when flavor === 'html'. */
  html?: string;
  /** Used when flavor === 'markdown'. */
  markdown?: string;
  /** Used when flavor === 'blocks'. */
  blocks?: RichBlock[];
  /** Media referenced from html/markdown flavors by tg://…?id=. */
  media?: RichMediaRef[];
  isRtl?: boolean;
  skipEntityDetection?: boolean;
}

export type PostMode = 'regular' | 'rich';

// ─── Channel + Post envelope ──────────────────────────────────────────────────

export interface Channel {
  id: string;
  name: string;
  telegramChatId: string;
  description?: string;
  isDefault?: boolean;
}

export interface PostPayload {
  id?: string;
  title: string;
  channelId: string;
  /** Regular-mode body. Ignored when mode === 'rich'. */
  text: string;
  parseMode: ParseMode;
  /** reply_markup keyboard (both modes). */
  buttons: InlineButtonRows;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  mode?: PostMode;
  rich?: RichMessage;
}

export interface Draft extends PostPayload {
  status: 'draft';
}

export interface PublishResponse {
  ok: boolean;
  post: PostPayload;
  telegramMessageId?: number;
}
