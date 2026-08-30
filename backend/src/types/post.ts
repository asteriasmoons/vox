export type ParseMode = 'HTML';
export type PostStatus = 'draft' | 'scheduled' | 'posted';

// ─── Regular post inline buttons (reply_markup, extended in Bot API 10.3) ─────

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

// ─── InputMedia* (Bot API subset the editor edits + send layer forwards) ─────

export interface InputMediaCommon {
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

export interface RichBlockCaption {
  text: string;
  credit?: string;
}

export interface RichBlockTableCell {
  text?: string;
  isHeader?: boolean;
  colspan?: number;
  rowspan?: number;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
}

export interface RichListItem {
  blocks: RichBlock[];
  hasCheckbox?: boolean;
  isChecked?: boolean;
  value?: number;
  labelType?: 'a' | 'A' | 'i' | 'I' | '1';
}

export interface RichMediaRef {
  id: string;
  media: InputMedia;
}

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
  html?: string;
  markdown?: string;
  blocks?: RichBlock[];
  media?: RichMediaRef[];
  isRtl?: boolean;
  skipEntityDetection?: boolean;
}

export type PostMode = 'regular' | 'rich';

// ─── Channel + Post envelope + existing app-level extras ─────────────────────

export interface Channel {
  id: string;
  name: string;
  telegramChatId: string;
  description?: string;
  username?: string;
  memberCount?: number;
  isDefault?: boolean;
  isFavorite?: boolean;
  connectedAt?: string;
  avatarColor?: string;
  source?: 'default' | 'manual';
  photo?: ChannelPhoto;
  photoUrl?: string;
  botCanAccess?: boolean;
  botIsAdmin?: boolean;
  accessStatus?: 'accessible' | 'admin' | 'not_admin' | 'inaccessible' | 'unresolved';
  accessError?: string;
}

export interface ChannelPhoto {
  smallFileId?: string;
  smallFileUniqueId?: string;
  bigFileId?: string;
  bigFileUniqueId?: string;
}

export interface PostPayload {
  id?: string;
  title: string;
  channelId: string;
  text: string;
  parseMode: ParseMode;
  buttons: InlineButtonRows;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  mode?: PostMode;
  rich?: RichMessage;
  tags?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  folder?: string;
  schedule?: ScheduleConfig;
  templateId?: string;
}

export interface ScheduleConfig {
  publishAt: string;
  timezone: string;
  repeat: RepeatMode;
  customInterval?: number;
  customUnit?: 'hours' | 'days' | 'weeks' | 'months';
  isPaused?: boolean;
  lastRanAt?: string;
  nextRunAt?: string;
}

export type RepeatMode = 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface Draft extends PostPayload {
  status: 'draft';
}

export interface PublishResponse {
  ok: boolean;
  post: PostPayload;
  telegramMessageId?: number;
}

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  text: string;
  buttons: InlineButtonRows;
  isFavorite?: boolean;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TemplateCategory =
  | 'announcement'
  | 'update'
  | 'patch-notes'
  | 'release'
  | 'maintenance'
  | 'giveaway'
  | 'contest'
  | 'news'
  | 'beta'
  | 'reminder'
  | 'custom';

export interface AnalyticsSnapshot {
  totalPosts: number;
  totalDrafts: number;
  totalScheduled: number;
  totalPublished: number;
  totalViews: number;
  averageViews: number;
  buttonClicks: number;
  engagement: number;
  publishingStreak: number;
  bestDay: string;
  bestHour: number;
  weeklyChart: Array<{ day: string; count: number }>;
  monthlyChart: Array<{ month: string; count: number }>;
  heatmap: Array<{ day: number; hour: number; count: number }>;
}

export interface BulkAction {
  ids: string[];
  action: 'delete' | 'archive' | 'unarchive' | 'favorite' | 'unfavorite' | 'trash' | 'restore' | 'tag' | 'untag';
  tag?: string;
}
