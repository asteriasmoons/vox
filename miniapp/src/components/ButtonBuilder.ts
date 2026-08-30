import type { InlineButton, InlineButtonKind, InlineButtonRows } from '../types/post';

/**
 * Builder for the row of buttons attached below the message. Each button
 * can be a URL, a callback the bot handles, a mini app launch, a login
 * link, a switch-inline, a copy-text, or a Pay button.
 */
const KIND_LABELS: Record<InlineButtonKind, string> = {
  url: 'URL',
  callback_data: 'Callback',
  web_app: 'Web App',
  login_url: 'Login URL',
  switch_inline_query: 'Switch Inline',
  switch_inline_query_current_chat: 'Switch Inline (here)',
  copy_text: 'Copy Text',
  pay: 'Pay'
};

const KIND_ORDER: InlineButtonKind[] = [
  'url',
  'callback_data',
  'web_app',
  'login_url',
  'switch_inline_query',
  'switch_inline_query_current_chat',
  'copy_text',
  'pay'
];

const PAYLOAD_FIELDS: Record<InlineButtonKind, { field: string; placeholder: string } | null> = {
  url: { field: 'url', placeholder: 'https://example.com' },
  callback_data: { field: 'callbackData', placeholder: 'action_id (1–64 bytes)' },
  web_app: { field: 'webAppUrl', placeholder: 'https://your.miniapp/…' },
  login_url: { field: 'loginUrl', placeholder: 'https://your.site/auth' },
  switch_inline_query: { field: 'switchInlineQuery', placeholder: 'default query text' },
  switch_inline_query_current_chat: { field: 'switchInlineQueryCurrentChat', placeholder: 'default query text' },
  copy_text: { field: 'copyText', placeholder: 'Text to copy (1–256)' },
  pay: null
};

function buttonKind(button: InlineButton): InlineButtonKind {
  return button.kind ?? 'url';
}

function payloadValue(button: InlineButton): string {
  const kind = buttonKind(button);
  const spec = PAYLOAD_FIELDS[kind];
  if (!spec) return '';
  return String((button as unknown as Record<string, unknown>)[spec.field] ?? (kind === 'url' ? button.url : '')) || '';
}

export function ButtonBuilder(buttons: InlineButtonRows): string {
  return `
    <div class="button-builder">
      <div class="section-heading">
        <div>
          <h3>Inline Buttons</h3>
          <p>Reply-keyboard buttons attached below the message.</p>
        </div>
        <button type="button" class="small-action" id="add-button-row">Add Row</button>
      </div>
      <div class="button-rows">
        ${buttons
          .map((row, rowIndex) => `
            <div class="builder-row" data-row-index="${rowIndex}">
              <div class="builder-row-top">
                <strong>Row ${rowIndex + 1}</strong>
                <button type="button" data-remove-row="${rowIndex}">Remove Row</button>
              </div>
              ${row.map((button, buttonIndex) => renderButton(button, rowIndex, buttonIndex)).join('')}
              <button type="button" class="ghost-action" data-add-button="${rowIndex}">Add Button</button>
            </div>
          `)
          .join('')}
      </div>
    </div>
  `;
}

function renderButton(button: InlineButton, rowIndex: number, buttonIndex: number): string {
  const kind = buttonKind(button);
  const spec = PAYLOAD_FIELDS[kind];
  const payload = payloadValue(button);
  return `
    <div class="builder-button" data-row-index="${rowIndex}" data-button-index="${buttonIndex}">
      <input data-button-field="text" value="${escapeAttr(button.text)}" placeholder="Button label" />
      <div class="builder-button-row">
        <select data-button-kind class="input">
          ${KIND_ORDER.map((k) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${KIND_LABELS[k]}</option>`).join('')}
        </select>
        ${spec ? `<input data-button-payload value="${escapeAttr(payload)}" placeholder="${escapeAttr(spec.placeholder)}" />` : '<span class="builder-note">Pay button — configured in your invoice payload.</span>'}
      </div>
      <div class="button-actions">
        <button type="button" data-move-left>←</button>
        <button type="button" data-move-right>→</button>
        <button type="button" data-remove-button>Remove</button>
      </div>
    </div>
  `;
}

function escapeAttr(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const INLINE_BUTTON_KINDS = KIND_ORDER;
export const INLINE_BUTTON_PAYLOAD_FIELDS = PAYLOAD_FIELDS;
