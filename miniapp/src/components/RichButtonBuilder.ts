import type { RichMessageButton, RichButtonStyle } from '../types/post';

/**
 * Builder for the buttons that live inside a rich message's Buttons block.
 * Each button has a style (primary / success / danger / link) and a kind
 * (URL, callback, web app, login, switch-inline, copy-text, or pay).
 * "link" style only works on callback buttons.
 */

const KIND_LABELS: Record<RichMessageButton['kind'], string> = {
  url: 'URL',
  callback_data: 'Callback',
  web_app: 'Web App',
  login_url: 'Login URL',
  switch_inline_query: 'Switch Inline',
  switch_inline_query_current_chat: 'Switch Inline (here)',
  copy_text: 'Copy Text',
  pay: 'Pay'
};

const KIND_ORDER: RichMessageButton['kind'][] = [
  'url',
  'callback_data',
  'web_app',
  'login_url',
  'switch_inline_query',
  'switch_inline_query_current_chat',
  'copy_text',
  'pay'
];

const PAYLOAD_FIELDS: Record<RichMessageButton['kind'], { field: keyof RichMessageButton; placeholder: string } | null> = {
  url: { field: 'url', placeholder: 'https://example.com or tg://…' },
  callback_data: { field: 'callbackData', placeholder: 'action_id (1–64 bytes)' },
  web_app: { field: 'webAppUrl', placeholder: 'https://your.miniapp/…' },
  login_url: { field: 'loginUrl', placeholder: 'https://your.site/auth' },
  switch_inline_query: { field: 'switchInlineQuery', placeholder: 'default query text' },
  switch_inline_query_current_chat: { field: 'switchInlineQueryCurrentChat', placeholder: 'default query text' },
  copy_text: { field: 'copyText', placeholder: 'Text to copy (1–256)' },
  pay: null
};

const STYLES: RichButtonStyle[] = ['primary', 'success', 'danger', 'link'];

export interface RichButtonBuilderScope {
  /**
   * Where in the block builder this rich-buttons block lives. The router
   * uses this to route back to the right block on input events. `path` is a
   * dot-joined chain of block indexes (e.g. "3.details.1" or plain "3").
   */
  scope: string;
  align?: 'left' | 'center' | 'right';
}

export function RichButtonBuilder(buttons: RichMessageButton[], scope: RichButtonBuilderScope): string {
  const alignValue = scope.align ?? 'left';
  return `
    <div class="rich-button-builder" data-rich-buttons-scope="${scope.scope}">
      <div class="section-heading">
        <div>
          <h3>Rich Buttons</h3>
          <p>Buttons rendered inside the message body (max 8 per row).</p>
        </div>
        <div class="rich-button-heading-actions">
          <label class="rich-button-align">
            Align
            <select data-rich-buttons-align class="input">
              <option value="left"${alignValue === 'left' ? ' selected' : ''}>Left</option>
              <option value="center"${alignValue === 'center' ? ' selected' : ''}>Center</option>
              <option value="right"${alignValue === 'right' ? ' selected' : ''}>Right</option>
            </select>
          </label>
          <button type="button" class="small-action" data-rich-buttons-add>Add Button</button>
        </div>
      </div>
      <div class="rich-button-list">
        ${buttons.map((button, index) => renderRichButton(button, index)).join('')}
        ${buttons.length === 0 ? '<p class="muted">No buttons yet — add one above.</p>' : ''}
      </div>
    </div>
  `;
}

function renderRichButton(button: RichMessageButton, index: number): string {
  const spec = PAYLOAD_FIELDS[button.kind];
  const payload = spec ? String((button as unknown as Record<string, unknown>)[spec.field] ?? '') : '';
  return `
    <div class="rich-button-row" data-rich-button-index="${index}">
      <input data-rich-button-field="text" value="${escapeAttr(button.text)}" placeholder="Button label" />
      <div class="rich-button-row-inner">
        <select data-rich-button-kind class="input">
          ${KIND_ORDER.map((k) => `<option value="${k}"${k === button.kind ? ' selected' : ''}>${KIND_LABELS[k]}</option>`).join('')}
        </select>
        ${spec ? `<input data-rich-button-payload value="${escapeAttr(payload)}" placeholder="${escapeAttr(spec.placeholder)}" />` : '<span class="builder-note">Pay button.</span>'}
        <select data-rich-button-style class="input">
          <option value="">Style: default</option>
          ${STYLES.map((s) => `<option value="${s}"${s === button.style ? ' selected' : ''}>${s}${s === 'link' ? ' (callback only)' : ''}</option>`).join('')}
        </select>
      </div>
      <div class="rich-button-actions">
        <button type="button" data-rich-button-move="-1" aria-label="Move up">↑</button>
        <button type="button" data-rich-button-move="1" aria-label="Move down">↓</button>
        <button type="button" data-rich-button-remove>Remove</button>
      </div>
    </div>
  `;
}

function escapeAttr(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const RICH_BUTTON_KINDS = KIND_ORDER;
export const RICH_BUTTON_PAYLOAD_FIELDS = PAYLOAD_FIELDS;
export const RICH_BUTTON_STYLES = STYLES;
