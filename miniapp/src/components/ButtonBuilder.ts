import type { InlineButtonRows } from '../types/post';

export function ButtonBuilder(buttons: InlineButtonRows): string {
  return `
    <div class="button-builder">
      <div class="section-heading">
        <div>
          <h3>Inline Buttons</h3>
          <p>Create rows of Telegram URL buttons.</p>
        </div>
        <button type="button" class="small-action" id="add-button-row">Add Row</button>
      </div>
      <div class="button-rows">
        ${buttons
          .map(
            (row, rowIndex) => `
              <div class="builder-row" data-row-index="${rowIndex}">
                <div class="builder-row-top">
                  <strong>Row ${rowIndex + 1}</strong>
                  <button type="button" data-remove-row="${rowIndex}">Remove Row</button>
                </div>
                ${row
                  .map(
                    (button, buttonIndex) => `
                      <div class="builder-button" data-row-index="${rowIndex}" data-button-index="${buttonIndex}">
                        <input data-button-field="text" value="${button.text}" placeholder="Button label" />
                        <input data-button-field="url" value="${button.url}" placeholder="https://example.com" />
                        <div class="button-actions">
                          <button type="button" data-move-left>←</button>
                          <button type="button" data-move-right>→</button>
                          <button type="button" data-remove-button>Remove</button>
                        </div>
                      </div>
                    `
                  )
                  .join('')}
                <button type="button" class="ghost-action" data-add-button="${rowIndex}">Add Button</button>
              </div>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}
