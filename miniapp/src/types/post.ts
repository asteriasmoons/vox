export type ParseMode = 'HTML';
export type PostStatus = 'draft' | 'scheduled' | 'posted';

export interface InlineButton {
  text: string;
  url: string;
}

export type InlineButtonRows = InlineButton[][];

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
