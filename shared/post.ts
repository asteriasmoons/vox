export type ParseMode = 'HTML';
export type PostStatus = 'draft' | 'scheduled' | 'posted';

// ─── Inline buttons for regular posts ─────────────────────────────────────────
// These are the keyboard buttons attached under a message. Every button has
// text and one action — a link to open, some data to send back to the bot,
// a mini app to launch, and so on. Old drafts only knew about URL buttons,
// so we keep `url` around and default `kind` to `'url'` when it's missing.

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
  /** Old shape — kept so older drafts still load. */
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

// ─── Media (photos, videos, files, audio, GIFs, voice notes) ─────────────────
// Anything the message attaches gets described here. The editor lets you
// edit the common fields; the rest are optional and forwarded as-is when
// they're set.

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

// ─── Rich messages ───────────────────────────────────────────────────────────
// A rich message is a fancier message than a plain one — it can have headings,
// lists, tables, photo/video/audio blocks, quotes, buttons inside the body,
// and more. Write one three ways: raw HTML, Markdown, or a list of blocks.

export type RichFlavor = 'html' | 'markdown' | 'blocks';
export type RichButtonStyle = 'danger' | 'success' | 'primary' | 'link';

/**
 * A button that lives inside a rich-message body (not in the reply keyboard).
 * The editor treats `text` as plain text; the send layer wraps it in
 * whatever Telegram wants when it goes out.
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
  /**
   * Optional follow-up for callback-data buttons only. When enabled, tapping
   * the button makes the bot send a regular Telegram message either into the
   * same chat the rich message lives in ("channel") or into the tapper's DM
   * with the bot ("dm"). Independent per button; ignored for other kinds.
   */
  followUp?: CallbackFollowUp;
}

export interface CallbackFollowUp {
  enabled: boolean;
  destination: 'channel' | 'dm';
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

/**
 * Caption for a media / collage / slideshow / map block.
 * `text` is the caption itself; `credit` is a smaller by-line underneath.
 */
export interface RichBlockCaption {
  text: string;
  credit?: string;
}

/**
 * A single cell in a rich table. Leave `text` off to get an empty
 * (invisible) cell. Everything else is standard table-cell stuff.
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
 * One item inside a rich list. The content is any nested blocks. A list
 * item can optionally show a checkbox and, for ordered lists, override its
 * number or use letters/roman numerals.
 */
export interface RichListItem {
  blocks: RichBlock[];
  hasCheckbox?: boolean;
  isChecked?: boolean;
  value?: number;
  labelType?: 'a' | 'A' | 'i' | 'I' | '1';
}

/**
 * A piece of media the HTML or Markdown body refers to by id. Give it a
 * short id (letters/numbers/underscore/dash), then drop it in the body as
 * `tg://photo?id=<id>` or `tg://video?id=<id>` and so on.
 */
export interface RichMediaRef {
  id: string;
  media: InputMedia;
}

/**
 * Every kind of block a rich message can contain. `type` names the shape;
 * the other fields are the block's content.
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
  /**
   * Editor-only companion for the "Inline Buttons" card while composing
   * a rich message. Persisted with the draft so the editor can hydrate
   * back to this state, and merged into the message body at send time —
   * as an InputRichBlockButtons block for the Blocks flavor, or as
   * <tg-button-row>…</tg-button-row> for the HTML and Markdown flavors.
   * Rich messages never use reply_markup for these buttons.
   */
  editorButtons?: RichMessageButton[];
  editorButtonsAlign?: 'left' | 'center' | 'right';
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
