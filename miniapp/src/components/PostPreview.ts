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
    <div class="tg-preview widget_frame_base theme_dark tme_mode">
      <div class="tgme_widget_message_wrap no_userpic">
        <div class="tgme_widget_message">
          <div class="tgme_widget_message_bubble">
            <i class="tgme_widget_message_bubble_tail" aria-hidden="true">
              <svg class="bubble_icon" width="9" height="20" viewBox="0 0 9 20">
                <path class="background" d="M9 0v20c-1.89-2.58-3.33-5.31-4.33-8.2C3.67 8.91 2.11 6.98 0 6c2.66 0 4.66-2 6-6h3Z"/>
              </svg>
            </i>
            <div class="tgme_widget_message_author accent_color">
              <span class="tgme_widget_message_owner_name" dir="auto">${escapeHtml(channelName)}</span>
            </div>
            <div class="tgme_widget_message_text js-message_text" dir="auto">${bodyHtml}</div>
            <div class="tgme_widget_message_footer compact js-message_footer">
              <div class="tgme_widget_message_info short js-message_info">
                <span class="tgme_widget_message_views">1</span>
              </div>
            </div>
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
  const previewRows = rows.flatMap((row) => {
    const shouldStack = row.length > 1 && row.some((button) => button.text.trim().length > 14);
    return shouldStack ? row.map((button) => [button]) : [row];
  });

  if (previewRows.length === 0) return '';

  return `
    <div class="tg-keyboard">
      ${previewRows
        .map(
          (row) => `
          <div class="tgme_widget_message_inline_row">
            ${row
              .map(
                (b) => `<a class="tgme_widget_message_inline_button url_button" href="${escapeAttr(b.url || '#')}" target="_blank" rel="noopener noreferrer"><span class="tgme_widget_message_inline_button_text" dir="auto">${escapeHtml(b.text)}</span></a>`
              )
              .join('')}
          </div>`
        )
        .join('')}
    </div>
  `;
}

function normalizeTelegramText(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n/g, '<br/>');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
