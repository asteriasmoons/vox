import type { InlineButtonRows } from '../types/post';

interface PostPreviewOptions {
  channelName?: string;
}

/**
 * Renders an HTML string that looks like a real Telegram message.
 *
 * The `text` parameter is already in Telegram HTML parse-mode format
 * (<b>, <i>, <u>, <s>, <code>, <pre>, <blockquote>, <tg-spoiler>).
 * We inject it directly so the browser renders the tags, then CSS
 * makes each tag look exactly the way Telegram does.
 */
export function PostPreview(text: string, buttons: InlineButtonRows, options: PostPreviewOptions = {}): string {
  const hasText = text.trim().length > 0;
  const hasButtons = buttons.some((row) => row.some((b) => b.text.trim()));
  const channelName = options.channelName?.trim() || 'Vox Testing';

  const placeholder = '<span class="tg-placeholder">Your message preview will appear here…</span>';
  const bodyHtml = hasText ? normalizeTelegramText(text) : placeholder;

  return `
    <div class="tg-preview">
      <div class="tg-chat-bg">
        <div class="tg-message-group">
          <div class="tg-bubble">
            <div class="tg-channel-name">${escapeHtml(channelName)}</div>
            <div class="tg-bubble-content">${bodyHtml}</div>
            <span class="tg-meta">
              <svg class="tg-eye" viewBox="0 0 20 14" width="15" height="11" aria-hidden="true">
                <path d="M10 0C5.7 0 2.1 2.55.5 7c1.6 4.45 5.2 7 9.5 7s7.9-2.55 9.5-7C17.9 2.55 14.3 0 10 0Zm0 11.4A4.4 4.4 0 1 1 10 2.6a4.4 4.4 0 0 1 0 8.8Zm0-1.9A2.5 2.5 0 1 0 10 4.5a2.5 2.5 0 0 0 0 5Z" fill="currentColor"/>
              </svg>
              <span>1</span>
              <span class="tg-time">${currentTime()}</span>
            </span>
          </div>
          ${hasButtons ? renderKeyboard(buttons) : ''}
        </div>
      </div>
    </div>
  `;
}

function renderKeyboard(buttons: InlineButtonRows): string {
  const rows = buttons
    .map((row) => row.filter((b) => b.text.trim()))
    .filter((row) => row.length > 0);

  if (rows.length === 0) return '';

  return `
    <div class="tg-keyboard">
      ${rows
        .map(
          (row) => `
          <div class="tg-keyboard-row">
            ${row
              .map(
                (b) => `<a class="tg-keyboard-btn" href="${escapeAttr(b.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(b.text)}</a>`
              )
              .join('')}
          </div>`
        )
        .join('')}
    </div>
  `;
}

function currentTime(): string {
  const now = new Date();
  const hours = now.getHours() % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  return `${hours}:${minutes} ${ampm}`;
}

function normalizeTelegramText(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
