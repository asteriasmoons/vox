import type {
  InputMedia,
  RichBlock,
  RichBlockCaption,
  RichBlockTableCell,
  RichListItem,
  RichMessageButton
} from '../types/post';
import { RichButtonBuilder } from './RichButtonBuilder';

/**
 * Editor for InputRichMessage.blocks. Renders every one of the 24
 * InputRichBlock* types listed in Bot API 10.3. Nested-blocks types
 * (blockquote, details, collage, slideshow, list items) recurse into
 * this same builder with an extended block path.
 *
 * Every input carries `data-block-path` (the location in the blocks tree) so
 * the router can address it without re-walking the DOM.
 *
 * Path grammar (slash-delimited):
 *   "3"                  → blocks[3]
 *   "3/blocks/1"         → blocks[3].blocks[1]              (blockquote/details/collage/slideshow)
 *   "3/items/2/blocks/0" → blocks[3].items[2].blocks[0]     (list item)
 */

export const ALL_BLOCK_TYPES: RichBlock['type'][] = [
  'paragraph',
  'heading',
  'pre',
  'footer',
  'divider',
  'mathematical_expression',
  'anchor',
  'list',
  'blockquote',
  'expandable_blockquote',
  'pullquote',
  'collage',
  'slideshow',
  'table',
  'details',
  'map',
  'buttons',
  'animation',
  'audio',
  'document',
  'photo',
  'video',
  'voice_note',
  'thinking'
];

export const BLOCK_LABELS: Record<RichBlock['type'], string> = {
  paragraph: 'Paragraph',
  heading: 'Heading',
  pre: 'Preformatted',
  footer: 'Footer',
  divider: 'Divider',
  mathematical_expression: 'Math (LaTeX)',
  anchor: 'Anchor',
  list: 'List',
  blockquote: 'Blockquote',
  expandable_blockquote: 'Expandable Blockquote',
  pullquote: 'Pull Quote',
  collage: 'Collage',
  slideshow: 'Slideshow',
  table: 'Table',
  details: 'Details / Disclosure',
  map: 'Map',
  buttons: 'Rich Buttons',
  animation: 'Animation',
  audio: 'Audio',
  document: 'Document',
  photo: 'Photo',
  video: 'Video',
  voice_note: 'Voice Note',
  thinking: 'Thinking (draft only)'
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export function makeBlock(type: RichBlock['type']): RichBlock {
  switch (type) {
    case 'paragraph': return { type: 'paragraph', text: '' };
    case 'heading': return { type: 'heading', text: '', size: 2 };
    case 'pre': return { type: 'pre', text: '' };
    case 'footer': return { type: 'footer', text: '' };
    case 'divider': return { type: 'divider' };
    case 'mathematical_expression': return { type: 'mathematical_expression', expression: '' };
    case 'anchor': return { type: 'anchor', name: '' };
    case 'list': return { type: 'list', ordered: false, items: [{ blocks: [{ type: 'paragraph', text: '' }] }] };
    case 'blockquote': return { type: 'blockquote', blocks: [{ type: 'paragraph', text: '' }] };
    case 'expandable_blockquote': return { type: 'expandable_blockquote', text: '' };
    case 'pullquote': return { type: 'pullquote', text: '' };
    case 'collage': return { type: 'collage', blocks: [] };
    case 'slideshow': return { type: 'slideshow', blocks: [] };
    case 'table': return { type: 'table', cells: [[emptyCell(), emptyCell()], [emptyCell(), emptyCell()]] };
    case 'details': return { type: 'details', summary: '', blocks: [{ type: 'paragraph', text: '' }] };
    case 'map': return { type: 'map', latitude: 0, longitude: 0 };
    case 'buttons': return { type: 'buttons', buttons: [] };
    case 'animation': return { type: 'animation', animation: { type: 'animation', media: '' } };
    case 'audio': return { type: 'audio', audio: { type: 'audio', media: '' } };
    case 'document': return { type: 'document', document: { type: 'document', media: '' } };
    case 'photo': return { type: 'photo', photo: { type: 'photo', media: '' } };
    case 'video': return { type: 'video', video: { type: 'video', media: '' } };
    case 'voice_note': return { type: 'voice_note', voiceNote: { type: 'voice_note', media: '' } };
    case 'thinking': return { type: 'thinking', text: '' };
  }
}

export function emptyCell(): RichBlockTableCell {
  return { text: '', align: 'left', valign: 'top' };
}

// ─── Path navigation ─────────────────────────────────────────────────────────

export function walkPath(blocks: RichBlock[], path: string): { parent: unknown[]; index: number } | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  let arr: unknown[] = blocks;
  for (let i = 0; i < segments.length - 1; i += 2) {
    const idx = Number(segments[i]);
    if (!Number.isFinite(idx) || idx < 0 || idx >= arr.length) return null;
    const key = segments[i + 1];
    const node = arr[idx] as Record<string, unknown>;
    if (key === 'blocks') arr = node.blocks as unknown[];
    else if (key === 'items') arr = node.items as unknown[];
    else return null;
  }
  const finalIdx = Number(segments[segments.length - 1]);
  if (!Number.isFinite(finalIdx)) return null;
  return { parent: arr, index: finalIdx };
}

// ─── Renderers ───────────────────────────────────────────────────────────────

export function RichBlockBuilder(blocks: RichBlock[], pathPrefix = ''): string {
  return `
    <div class="rich-block-builder" data-rich-block-scope="${pathPrefix || 'root'}">
      <div class="rich-block-list">
        ${blocks.map((block, index) => renderBlock(block, joinPath(pathPrefix, String(index)))).join('')}
        ${blocks.length === 0 ? '<p class="muted">No blocks yet — add one below.</p>' : ''}
      </div>
      <div class="rich-block-add">
        <select data-rich-block-add-type="${pathPrefix || 'root'}" class="input">
          ${ALL_BLOCK_TYPES.map((t) => `<option value="${t}">${BLOCK_LABELS[t]}</option>`).join('')}
        </select>
        <button type="button" class="small-action" data-rich-block-add="${pathPrefix || 'root'}">Add Block</button>
      </div>
    </div>
  `;
}

function joinPath(prefix: string, tail: string): string {
  return prefix ? `${prefix}/${tail}` : tail;
}

function renderBlock(block: RichBlock, path: string): string {
  const header = `
    <div class="rich-block-header">
      <strong>${BLOCK_LABELS[block.type]}</strong>
      <div class="rich-block-header-actions">
        <button type="button" data-rich-block-move="-1" data-rich-block-path="${path}" aria-label="Move up">↑</button>
        <button type="button" data-rich-block-move="1" data-rich-block-path="${path}" aria-label="Move down">↓</button>
        <button type="button" data-rich-block-remove data-rich-block-path="${path}">Remove</button>
      </div>
    </div>`;

  const body = renderBlockBody(block, path);

  return `<div class="rich-block" data-rich-block-item data-rich-block-path="${path}" data-rich-block-type="${block.type}">${header}${body}</div>`;
}

function renderBlockBody(block: RichBlock, path: string): string {
  switch (block.type) {
    case 'paragraph':
    case 'footer':
    case 'thinking':
      return `<textarea data-rich-block-field="text" data-rich-block-path="${path}" placeholder="${block.type === 'thinking' ? 'Thinking… placeholder text' : 'Text'}">${escapeText(block.text)}</textarea>`;

    case 'heading':
      return `
        <textarea data-rich-block-field="text" data-rich-block-path="${path}" placeholder="Heading text">${escapeText(block.text)}</textarea>
        <label class="rich-block-inline">Size (1 largest — 6 smallest)
          <select data-rich-block-field="size" data-rich-block-path="${path}" class="input">
            ${[1, 2, 3, 4, 5, 6].map((s) => `<option value="${s}"${s === block.size ? ' selected' : ''}>H${s}</option>`).join('')}
          </select>
        </label>`;

    case 'pre':
      return `
        <textarea data-rich-block-field="text" data-rich-block-path="${path}" placeholder="Preformatted text">${escapeText(block.text)}</textarea>
        <label class="rich-block-inline">Language
          <input data-rich-block-field="language" data-rich-block-path="${path}" value="${escapeAttr(block.language ?? '')}" placeholder="e.g. python" />
        </label>`;

    case 'divider':
      return `<p class="muted">A horizontal rule — no fields.</p>`;

    case 'mathematical_expression':
      return `<textarea data-rich-block-field="expression" data-rich-block-path="${path}" placeholder="LaTeX expression, e.g. \\int_0^1 x^2 dx">${escapeText(block.expression)}</textarea>`;

    case 'anchor':
      return `<input data-rich-block-field="name" data-rich-block-path="${path}" value="${escapeAttr(block.name)}" placeholder="anchor-name" />`;

    case 'expandable_blockquote':
    case 'pullquote':
      return `
        <textarea data-rich-block-field="text" data-rich-block-path="${path}" placeholder="Quote text">${escapeText(block.text)}</textarea>
        <input data-rich-block-field="credit" data-rich-block-path="${path}" value="${escapeAttr(block.credit ?? '')}" placeholder="Credit (optional)" />`;

    case 'list':
      return `
        <label class="rich-block-inline">
          <input type="checkbox" data-rich-block-field="ordered" data-rich-block-path="${path}" ${block.ordered ? 'checked' : ''} />
          Ordered
        </label>
        <div class="rich-list-items">
          ${block.items.map((item, i) => renderListItem(item, `${path}/items/${i}`)).join('')}
        </div>
        <button type="button" class="ghost-action" data-rich-list-add="${path}">Add Item</button>`;

    case 'blockquote':
      return `
        <input data-rich-block-field="credit" data-rich-block-path="${path}" value="${escapeAttr(block.credit ?? '')}" placeholder="Credit (optional)" />
        <div class="rich-nested">${RichBlockBuilder(block.blocks, `${path}/blocks`)}</div>`;

    case 'details':
      return `
        <input data-rich-block-field="summary" data-rich-block-path="${path}" value="${escapeAttr(block.summary)}" placeholder="Summary (always visible)" />
        <label class="rich-block-inline">
          <input type="checkbox" data-rich-block-field="isOpen" data-rich-block-path="${path}" ${block.isOpen ? 'checked' : ''} />
          Open by default
        </label>
        <div class="rich-nested">${RichBlockBuilder(block.blocks, `${path}/blocks`)}</div>`;

    case 'collage':
    case 'slideshow':
      return `
        ${renderCaption(block.caption, path)}
        <div class="rich-nested">${RichBlockBuilder(block.blocks, `${path}/blocks`)}</div>`;

    case 'table':
      return renderTable(block, path);

    case 'map':
      return `
        <div class="rich-block-grid">
          <label>Latitude<input data-rich-block-field="latitude" data-rich-block-path="${path}" type="number" step="any" value="${block.latitude}" /></label>
          <label>Longitude<input data-rich-block-field="longitude" data-rich-block-path="${path}" type="number" step="any" value="${block.longitude}" /></label>
          <label>Zoom (0–24)<input data-rich-block-field="zoom" data-rich-block-path="${path}" type="number" min="0" max="24" value="${block.zoom ?? ''}" /></label>
          <label>Width (0–10000)<input data-rich-block-field="width" data-rich-block-path="${path}" type="number" min="0" max="10000" value="${block.width ?? ''}" /></label>
          <label>Height (0–10000)<input data-rich-block-field="height" data-rich-block-path="${path}" type="number" min="0" max="10000" value="${block.height ?? ''}" /></label>
        </div>
        ${renderCaption(block.caption, path)}`;

    case 'buttons':
      return RichButtonBuilder(block.buttons, { scope: path, align: block.align });

    case 'photo':
    case 'video':
    case 'animation':
    case 'audio':
    case 'document':
    case 'voice_note': {
      const media = mediaOf(block);
      return `
        ${renderInputMedia(media, path)}
        ${renderCaption(block.caption, path)}`;
    }
  }
}

function mediaOf(block: RichBlock): InputMedia {
  switch (block.type) {
    case 'photo': return block.photo;
    case 'video': return block.video;
    case 'animation': return block.animation;
    case 'audio': return block.audio;
    case 'document': return block.document;
    case 'voice_note': return block.voiceNote;
    default: throw new Error(`mediaOf called on non-media block type: ${block.type}`);
  }
}

function renderListItem(item: RichListItem, path: string): string {
  return `
    <div class="rich-list-item" data-rich-list-item data-rich-block-path="${path}">
      <div class="rich-list-item-header">
        <div class="rich-list-item-meta">
          <label><input type="checkbox" data-rich-list-item-field="hasCheckbox" data-rich-block-path="${path}" ${item.hasCheckbox ? 'checked' : ''} /> Checkbox</label>
          <label><input type="checkbox" data-rich-list-item-field="isChecked" data-rich-block-path="${path}" ${item.isChecked ? 'checked' : ''} /> Checked</label>
          <label>Value <input type="number" data-rich-list-item-field="value" data-rich-block-path="${path}" value="${item.value ?? ''}" style="width:5rem" /></label>
          <label>Label
            <select data-rich-list-item-field="labelType" data-rich-block-path="${path}" class="input">
              <option value=""${!item.labelType ? ' selected' : ''}>default</option>
              ${['a', 'A', 'i', 'I', '1'].map((t) => `<option value="${t}"${item.labelType === t ? ' selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="rich-list-item-actions">
          <button type="button" data-rich-list-move="-1" data-rich-block-path="${path}">↑</button>
          <button type="button" data-rich-list-move="1" data-rich-block-path="${path}">↓</button>
          <button type="button" data-rich-list-remove data-rich-block-path="${path}">Remove</button>
        </div>
      </div>
      <div class="rich-nested">${RichBlockBuilder(item.blocks, `${path}/blocks`)}</div>
    </div>`;
}

function renderCaption(caption: RichBlockCaption | undefined | { text: string; credit?: string }, path: string): string {
  const text = caption?.text ?? '';
  const credit = caption?.credit ?? '';
  return `
    <div class="rich-block-caption">
      <input data-rich-block-caption-field="text" data-rich-block-path="${path}" value="${escapeAttr(text)}" placeholder="Caption (optional)" />
      <input data-rich-block-caption-field="credit" data-rich-block-path="${path}" value="${escapeAttr(credit)}" placeholder="Credit (optional)" />
    </div>`;
}

function renderInputMedia(media: InputMedia, path: string): string {
  const advanced = renderMediaAdvanced(media, path);
  return `
    <div class="rich-media-inline">
      <input data-rich-media-inline-field="media" data-rich-block-path="${path}" value="${escapeAttr(media.media)}" placeholder="file_id, https://… URL, or attach://<name>" />
      <textarea data-rich-media-inline-field="caption" data-rich-block-path="${path}" placeholder="Media caption (0–1024)">${escapeText(media.caption ?? '')}</textarea>
      ${advanced}
    </div>`;
}

function renderMediaAdvanced(media: InputMedia, path: string): string {
  const rows: string[] = [];
  if ('thumbnail' in media) rows.push(`<label>Thumbnail<input data-rich-media-inline-field="thumbnail" data-rich-block-path="${path}" value="${escapeAttr(media.thumbnail ?? '')}" placeholder="thumb file_id / URL / attach://…" /></label>`);
  if ('width' in media) rows.push(`<label>Width<input type="number" data-rich-media-inline-field="width" data-rich-block-path="${path}" value="${media.width ?? ''}" /></label>`);
  if ('height' in media) rows.push(`<label>Height<input type="number" data-rich-media-inline-field="height" data-rich-block-path="${path}" value="${media.height ?? ''}" /></label>`);
  if ('duration' in media) rows.push(`<label>Duration (s)<input type="number" data-rich-media-inline-field="duration" data-rich-block-path="${path}" value="${media.duration ?? ''}" /></label>`);
  if ('hasSpoiler' in media) rows.push(`<label><input type="checkbox" data-rich-media-inline-field="hasSpoiler" data-rich-block-path="${path}" ${media.hasSpoiler ? 'checked' : ''} /> Spoiler</label>`);
  if ('performer' in media) rows.push(`<label>Performer<input data-rich-media-inline-field="performer" data-rich-block-path="${path}" value="${escapeAttr(media.performer ?? '')}" /></label>`);
  if ('title' in media) rows.push(`<label>Title<input data-rich-media-inline-field="title" data-rich-block-path="${path}" value="${escapeAttr(media.title ?? '')}" /></label>`);
  if ('supportsStreaming' in media) rows.push(`<label><input type="checkbox" data-rich-media-inline-field="supportsStreaming" data-rich-block-path="${path}" ${media.supportsStreaming ? 'checked' : ''} /> Supports streaming</label>`);
  if ('cover' in media) rows.push(`<label>Cover<input data-rich-media-inline-field="cover" data-rich-block-path="${path}" value="${escapeAttr(media.cover ?? '')}" placeholder="cover file_id / URL" /></label>`);
  if ('startTimestamp' in media) rows.push(`<label>Start (s)<input type="number" data-rich-media-inline-field="startTimestamp" data-rich-block-path="${path}" value="${media.startTimestamp ?? ''}" /></label>`);
  if ('disableContentTypeDetection' in media) rows.push(`<label><input type="checkbox" data-rich-media-inline-field="disableContentTypeDetection" data-rich-block-path="${path}" ${media.disableContentTypeDetection ? 'checked' : ''} /> Disable content-type detection</label>`);
  rows.push(`<label><input type="checkbox" data-rich-media-inline-field="showCaptionAboveMedia" data-rich-block-path="${path}" ${media.showCaptionAboveMedia ? 'checked' : ''} /> Caption above media</label>`);
  if (rows.length === 0) return '';
  return `<details class="rich-media-advanced"><summary>Advanced</summary><div class="rich-block-grid">${rows.join('')}</div></details>`;
}

function renderTable(block: Extract<RichBlock, { type: 'table' }>, path: string): string {
  const rowCount = block.cells.length;
  const colCount = block.cells.reduce((max, row) => Math.max(max, row.length), 0);
  return `
    <div class="rich-block-table" data-rich-block-path="${path}">
      <div class="rich-block-inline">
        <label><input type="checkbox" data-rich-block-field="isBordered" data-rich-block-path="${path}" ${block.isBordered ? 'checked' : ''} /> Bordered</label>
        <label><input type="checkbox" data-rich-block-field="isStriped" data-rich-block-path="${path}" ${block.isStriped ? 'checked' : ''} /> Striped</label>
        <label><input type="checkbox" data-rich-block-field="isCompact" data-rich-block-path="${path}" ${block.isCompact ? 'checked' : ''} /> Compact</label>
      </div>
      <input data-rich-block-field="caption" data-rich-block-path="${path}" value="${escapeAttr(block.caption ?? '')}" placeholder="Table caption (optional)" />
      <table class="rich-table-edit">
        <tbody>
          ${block.cells.map((row, r) => `
            <tr data-rich-table-row="${r}">
              ${row.map((cell, c) => renderCell(cell, path, r, c)).join('')}
              <td class="rich-table-row-actions">
                <button type="button" data-rich-table-row-remove="${r}" data-rich-block-path="${path}">−</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="rich-table-dim">${rowCount}×${colCount}</p>
      <div class="rich-table-actions">
        <button type="button" data-rich-table-row-add data-rich-block-path="${path}">+ Row</button>
        <button type="button" data-rich-table-col-add data-rich-block-path="${path}">+ Column</button>
        <button type="button" data-rich-table-col-remove data-rich-block-path="${path}">− Last Column</button>
      </div>
    </div>`;
}

function renderCell(cell: RichBlockTableCell, path: string, row: number, col: number): string {
  return `
    <td class="rich-table-cell" data-rich-table-cell data-rich-block-path="${path}" data-rich-table-row="${row}" data-rich-table-col="${col}">
      <input data-rich-cell-field="text" value="${escapeAttr(cell.text ?? '')}" placeholder="cell" />
      <div class="rich-cell-meta">
        <label>Align<select data-rich-cell-field="align">
          ${(['left', 'center', 'right'] as const).map((a) => `<option value="${a}"${a === cell.align ? ' selected' : ''}>${a}</option>`).join('')}
        </select></label>
        <label>VAlign<select data-rich-cell-field="valign">
          ${(['top', 'middle', 'bottom'] as const).map((a) => `<option value="${a}"${a === cell.valign ? ' selected' : ''}>${a}</option>`).join('')}
        </select></label>
        <label>Col<input type="number" min="1" data-rich-cell-field="colspan" value="${cell.colspan ?? 1}" style="width:3rem" /></label>
        <label>Row<input type="number" min="1" data-rich-cell-field="rowspan" value="${cell.rowspan ?? 1}" style="width:3rem" /></label>
        <label><input type="checkbox" data-rich-cell-field="isHeader" ${cell.isHeader ? 'checked' : ''} /> Header</label>
      </div>
    </td>`;
}

function escapeAttr(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeText(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
