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
  isDefault?: boolean;
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
}

export interface Draft extends PostPayload {
  status: 'draft';
}

export interface PublishResponse {
  ok: boolean;
  post: PostPayload;
  telegramMessageId?: number;
}
