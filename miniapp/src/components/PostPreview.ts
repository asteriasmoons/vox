import type { InlineButtonRows } from '../types/post';

export function PostPreview(text: string, buttons: InlineButtonRows): string {
  return `
    <div class="post-preview">
      <div class="preview-bubble">${text || '<span class="muted">Your announcement preview will appear here...</span>'}</div>
      <div class="preview-buttons">
        ${buttons
          .map(
            (row) => `
              <div class="preview-button-row">
                ${row.map((button) => `<a href="${button.url || '#'}">${button.text || 'Button'}</a>`).join('')}
              </div>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}
