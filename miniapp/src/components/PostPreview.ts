import type { InlineButtonRows } from '../types/post';

/**
 * Renders an HTML string that looks like a real Telegram message.
 *
 * The `text` parameter is already in Telegram HTML parse-mode format
 * (<b>, <i>, <u>, <s>, <code>, <pre>, <blockquote>, <tg-spoiler>).
 * We inject it directly so the browser renders the tags, then CSS
 * makes each tag look exactly the way Telegram does.
 */
export function PostPreview(text: string, buttons: InlineButtonRows, title?: string): string {
  const hasText = text.trim().length > 0;
  const hasButtons = buttons.some((row) => row.some((b) => b.text.trim()));

  const placeholder = '<span class="tg-placeholder">Your message preview will appear here…</span>';

  const titleHtml = title?.trim()
    ? `<strong class="tg-msg-title">${escapeHtml(title.trim())}</strong>\n`
    : '';

  const bodyHtml = hasText ? titleHtml + text : (title?.trim() ? titleHtml : placeholder);

  return `
    <div class="tg-preview">
      <div class="tg-chat-bg">
        <div class="tg-message-group">
          <div class="tg-bubble">
            <div class="tg-bubble-content">${bodyHtml}</div>
            <span class="tg-meta">
              <span class="tg-time">${currentTime()}</span>
              <svg class="tg-check" viewBox="0 0 16 11" width="16" height="11">
                <path d="M11.07.66l-5.4 5.4L3.41 3.8l-1.2 1.2 3.46 3.48 6.6-6.6z" fill="currentColor"/>
              </svg>
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

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
