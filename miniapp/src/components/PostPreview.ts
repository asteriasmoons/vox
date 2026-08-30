import type {
  InlineButton,
  InlineButtonRows,
  RichBlock,
  RichBlockCaption,
  RichBlockTableCell,
  RichListItem,
  RichMediaRef,
  RichMessage,
  RichMessageButton
} from '../types/post';
import { referenceLinkFor } from './RichMediaList';

interface PostPreviewOptions {
  channelName?: string;
  /** Post mode — when 'rich', renders from `rich` and ignores `text`. */
  mode?: 'regular' | 'rich';
  rich?: RichMessage;
}

/**
 * Draws a preview shaped like a real Telegram message.
 *
 * In Regular mode `text` is treated as Telegram HTML and dropped straight
 * into a bubble; the reply-keyboard buttons show below.
 *
 * In Rich mode we do our best to render what you're building: HTML goes in
 * as-is (with media references swapped for inline thumbs), Markdown runs
 * through a small converter, and Blocks walks the tree and draws each block.
 */
export function PostPreview(text: string, buttons: InlineButtonRows, options: PostPreviewOptions = {}): string {
  const channelName = options.channelName?.trim() || 'Vox Testing';
  const mode = options.mode ?? 'regular';

  let bodyHtml: string;
  if (mode === 'rich' && options.rich) {
    bodyHtml = renderRichBody(options.rich);
  } else {
    const hasText = text.trim().length > 0;
    bodyHtml = hasText
      ? normalizeTelegramText(text)
      : '<span class="tg-placeholder">Your message preview will appear here…</span>';
  }

  const hasKeyboard = buttons.some((row) => row.some((b) => b.text.trim()));

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
          </div>
          ${hasKeyboard ? renderKeyboard(buttons) : ''}
        </div>
      </div>
    </div>
  `;
}

// ─── Regular / reply-markup keyboard ─────────────────────────────────────────

function renderKeyboard(buttons: InlineButtonRows): string {
  const rows = buttons
    .map((row) => row.filter((b) => b.text.trim()))
    .filter((row) => row.length > 0);
  const previewRows = rows.flatMap((row) => {
    const shouldStack = row.length > 1 && row.some((b) => b.text.trim().length > 14);
    return shouldStack ? row.map((b) => [b]) : [row];
  });
  if (previewRows.length === 0) return '';
  return `
    <div class="tg-keyboard">
      ${previewRows.map((row) => `
        <div class="tgme_widget_message_inline_row">
          ${row.map((b) => `<a class="tgme_widget_message_inline_button ${kindClass(b)}" href="${escapeAttr(inlineButtonHref(b))}" target="_blank" rel="noopener noreferrer"><span class="tgme_widget_message_inline_button_text" dir="auto">${escapeHtml(b.text)} ${kindBadge(b)}</span></a>`).join('')}
        </div>`).join('')}
    </div>
  `;
}

function inlineButtonHref(button: InlineButton): string {
  switch (button.kind ?? 'url') {
    case 'url': return button.url || '#';
    case 'web_app': return button.webAppUrl || '#';
    case 'login_url': return button.loginUrl || '#';
    default: return '#';
  }
}

function kindClass(button: InlineButton): string {
  return `url_button tg-kind-${button.kind ?? 'url'}`;
}

function kindBadge(button: InlineButton): string {
  const kind = button.kind ?? 'url';
  if (kind === 'url') return '';
  const label: Record<string, string> = {
    callback_data: '⚡',
    web_app: '🪟',
    login_url: '🔑',
    switch_inline_query: '↗',
    switch_inline_query_current_chat: '↩',
    copy_text: '📋',
    pay: '💳'
  };
  return `<span class="tg-kind-badge">${label[kind] ?? ''}</span>`;
}

// ─── Rich body rendering ─────────────────────────────────────────────────────

function renderRichBody(rich: RichMessage): string {
  const media = rich.media ?? [];
  let body: string;
  switch (rich.flavor) {
    case 'html': body = renderRichHtml(rich.html ?? '', media); break;
    case 'markdown': body = renderRichMarkdown(rich.markdown ?? '', media); break;
    case 'blocks': body = renderRichBlocks(rich.blocks ?? []); break;
  }
  // The rich-mode Inline Buttons live inside the message body for every
  // flavor (rich messages don't use reply_markup), so tack them on here.
  if (rich.editorButtons && rich.editorButtons.length > 0) {
    body += renderRichButtonsRow(rich.editorButtons, rich.editorButtonsAlign);
  }
  const rtl = rich.isRtl ? ' dir="rtl"' : '';
  return `<div class="tg-rich" data-flavor="${rich.flavor}"${rtl}>${body || '<span class="tg-placeholder">Rich message preview…</span>'}</div>`;
}

function renderRichHtml(html: string, media: RichMediaRef[]): string {
  return replaceTgLinks(html, media) || '';
}

function renderRichMarkdown(md: string, media: RichMediaRef[]): string {
  const withLinks = replaceTgLinks(md, media);
  return miniMarkdown(withLinks);
}

function replaceTgLinks(source: string, media: RichMediaRef[]): string {
  return source.replace(/tg:\/\/(photo|video|document|audio)\?id=([A-Za-z0-9_-]{1,64})/g, (_m, _scheme, id) => {
    const ref = media.find((r) => r.id === id);
    if (!ref) return `<em class="tg-missing-media">[missing media: ${escapeHtml(id)}]</em>`;
    return renderMediaThumb(ref);
  });
}

function renderMediaThumb(ref: RichMediaRef): string {
  const link = referenceLinkFor(ref);
  const caption = ref.media.caption ? `<figcaption>${escapeHtml(ref.media.caption)}</figcaption>` : '';
  if (ref.media.type === 'photo' || ref.media.type === 'animation') {
    return `<figure class="tg-rich-photo"><img src="${escapeAttr(ref.media.media)}" alt="${escapeAttr(ref.id)}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"/><div class="tg-rich-media-fallback" style="display:none;">📷 ${escapeHtml(ref.id)}</div>${caption}</figure>`;
  }
  if (ref.media.type === 'video') {
    return `<figure class="tg-rich-video"><div class="tg-rich-media-fallback">▶ ${escapeHtml(ref.id)} <span class="muted">${escapeHtml(link)}</span></div>${caption}</figure>`;
  }
  if (ref.media.type === 'audio' || ref.media.type === 'voice_note') {
    return `<figure class="tg-rich-audio"><div class="tg-rich-media-fallback">♪ ${escapeHtml(ref.id)}</div>${caption}</figure>`;
  }
  return `<figure class="tg-rich-doc"><div class="tg-rich-media-fallback">📎 ${escapeHtml(ref.id)}</div>${caption}</figure>`;
}

function miniMarkdown(src: string): string {
  // A conservative subset: headings, bold, italic, code, blockquote, list, hr, paragraphs, autolinks.
  // Media references are already substituted with HTML before this runs.
  const escaped = escapeHtml(src)
    // Restore <figure>/<img>/etc that we injected before escaping — the tg-links
    // pass produces safe HTML that we'd otherwise double-escape. Do that by
    // deferring: we swap tg:// links AFTER md conversion below to keep it simple.
    ;
  // Since we called replaceTgLinks first, the source string contains raw HTML.
  // Escape only the parts that aren't already HTML tags — do a naïve line pass.
  const rawLines = src.split(/\n/);
  const out: string[] = [];
  let inList = false;
  let listOrdered = false;
  const closeList = () => { if (inList) { out.push(listOrdered ? '</ol>' : '</ul>'); inList = false; } };

  for (const line of rawLines) {
    if (/^\s*$/.test(line)) { closeList(); continue; }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) { closeList(); const n = heading[1].length; out.push(`<h${n} class="tg-md-h">${inline(heading[2])}</h${n}>`); continue; }
    const hr = /^\s*(---|\*\*\*|___)\s*$/.exec(line);
    if (hr) { closeList(); out.push('<hr class="tg-md-hr" />'); continue; }
    const bq = /^\s*>\s?(.*)$/.exec(line);
    if (bq) { closeList(); out.push(`<blockquote class="tg-md-bq">${inline(bq[1])}</blockquote>`); continue; }
    const ol = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (ol) {
      if (!inList || !listOrdered) { closeList(); out.push('<ol class="tg-md-ol">'); inList = true; listOrdered = true; }
      out.push(`<li>${inline(ol[2])}</li>`); continue;
    }
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      if (!inList || listOrdered) { closeList(); out.push('<ul class="tg-md-ul">'); inList = true; listOrdered = false; }
      out.push(`<li>${inline(ul[1])}</li>`); continue;
    }
    closeList();
    // If the line already contains HTML (from tg-link replacement), pass through; else wrap as paragraph.
    if (/^<\w/.test(line.trim())) out.push(line);
    else out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('');

  function inline(s: string): string {
    // Guard against re-escaping HTML we injected via replaceTgLinks: if the
    // segment starts with a tag, skip escape for that fragment.
    if (/<\w/.test(s)) return s
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    return escapeHtml(s)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
}

// ─── Blocks flavor ───────────────────────────────────────────────────────────

function renderRichBlocks(blocks: RichBlock[]): string {
  return blocks.map(renderBlock).join('');
}

function renderBlock(block: RichBlock): string {
  switch (block.type) {
    case 'paragraph': return `<p class="tg-rich-p">${formatText(block.text)}</p>`;
    case 'heading': return `<h${block.size} class="tg-rich-h">${applyInlineFormatting(escapeHtml(block.text))}</h${block.size}>`;
    case 'pre': return `<pre class="tg-rich-pre${block.language ? ` lang-${escapeAttr(block.language)}` : ''}"><code>${escapeHtml(block.text)}</code></pre>`;
    case 'footer': return `<footer class="tg-rich-footer">${formatText(block.text)}</footer>`;
    case 'divider': return `<hr class="tg-rich-hr" />`;
    case 'mathematical_expression': return `<div class="tg-rich-math"><code>${escapeHtml(block.expression)}</code></div>`;
    case 'anchor': return `<a class="tg-rich-anchor" id="${escapeAttr(block.name)}"></a>`;
    case 'expandable_blockquote':
      return `<blockquote class="tg-rich-bq tg-rich-bq-expandable">${formatText(block.text)}${block.credit ? `<cite>${escapeHtml(block.credit)}</cite>` : ''}</blockquote>`;
    case 'pullquote':
      return `<aside class="tg-rich-pullquote">${formatText(block.text)}${block.credit ? `<cite>${escapeHtml(block.credit)}</cite>` : ''}</aside>`;
    case 'blockquote':
      return `<blockquote class="tg-rich-bq">${renderRichBlocks(block.blocks)}${block.credit ? `<cite>${escapeHtml(block.credit)}</cite>` : ''}</blockquote>`;
    case 'details':
      return `<details class="tg-rich-details"${block.isOpen ? ' open' : ''}><summary>${escapeHtml(block.summary)}</summary>${renderRichBlocks(block.blocks)}</details>`;
    case 'list':
      return renderList(block.ordered, block.items);
    case 'collage':
      return `<div class="tg-rich-collage">${renderRichBlocks(block.blocks)}${renderCaption(block.caption)}</div>`;
    case 'slideshow':
      return `<div class="tg-rich-slideshow">${renderRichBlocks(block.blocks)}${renderCaption(block.caption)}</div>`;
    case 'table':
      return renderTable(block.cells, block.caption, block.isBordered, block.isStriped, block.isCompact);
    case 'map':
      return `<div class="tg-rich-map">🗺 ${block.latitude.toFixed(4)}, ${block.longitude.toFixed(4)}${block.zoom != null ? ` @z${block.zoom}` : ''}${renderCaption(block.caption)}</div>`;
    case 'buttons':
      return renderRichButtonsRow(block.buttons, block.align);
    case 'photo':
    case 'video':
    case 'animation':
    case 'audio':
    case 'document':
    case 'voice_note': {
      const media = mediaFromBlock(block);
      const icon = mediaIcon(block.type);
      const preview = block.type === 'photo' || block.type === 'animation'
        ? `<img src="${escapeAttr(media.media)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" /><div class="tg-rich-media-fallback" style="display:none;">${icon} ${escapeHtml(media.media || '(no media)')}</div>`
        : `<div class="tg-rich-media-fallback">${icon} ${escapeHtml(media.media || '(no media)')}</div>`;
      return `<figure class="tg-rich-media tg-rich-media-${block.type}">${preview}${renderCaption(block.caption)}</figure>`;
    }
    case 'thinking':
      return `<div class="tg-rich-thinking">🧠 <em>${escapeHtml(block.text)}</em></div>`;
  }
}

function mediaFromBlock(block: RichBlock): { media: string; caption?: string } {
  switch (block.type) {
    case 'photo': return block.photo;
    case 'video': return block.video;
    case 'animation': return block.animation;
    case 'audio': return block.audio;
    case 'document': return block.document;
    case 'voice_note': return block.voiceNote;
    default: return { media: '' };
  }
}

function mediaIcon(type: string): string {
  return ({ photo: '📷', video: '▶', animation: '🎞', audio: '♪', document: '📎', voice_note: '🎤' } as Record<string, string>)[type] || '';
}

function renderList(ordered: boolean, items: RichListItem[]): string {
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag} class="tg-rich-list">${items.map((item) => {
    const check = item.hasCheckbox ? `<input type="checkbox" ${item.isChecked ? 'checked' : ''} disabled /> ` : '';
    const value = item.value != null ? ` value="${item.value}"` : '';
    const listType = item.labelType ? ` type="${item.labelType}"` : '';
    return `<li${value}${listType}>${check}${renderRichBlocks(item.blocks)}</li>`;
  }).join('')}</${tag}>`;
}

function renderTable(cells: RichBlockTableCell[][], caption: string | undefined, bordered?: boolean, striped?: boolean, compact?: boolean): string {
  const cls = ['tg-rich-table', bordered ? 'bordered' : '', striped ? 'striped' : '', compact ? 'compact' : ''].filter(Boolean).join(' ');
  return `<table class="${cls}">${caption ? `<caption>${escapeHtml(caption)}</caption>` : ''}<tbody>${cells.map((row) => `<tr>${row.map((cell) => {
    const tag = cell.isHeader ? 'th' : 'td';
    const attrs = [
      cell.colspan && cell.colspan > 1 ? ` colspan="${cell.colspan}"` : '',
      cell.rowspan && cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : '',
      ` style="text-align:${cell.align};vertical-align:${cell.valign}"`
    ].join('');
    if (cell.text == null) return `<${tag}${attrs} class="invisible"></${tag}>`;
    return `<${tag}${attrs}>${escapeHtml(cell.text)}</${tag}>`;
  }).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderRichButtonsRow(buttons: RichMessageButton[], align?: 'left' | 'center' | 'right'): string {
  if (buttons.length === 0) return '';
  return `<div class="tg-rich-buttons" style="justify-content:${alignToJustify(align)}">${buttons.map((b) => {
    const style = b.style ? ` tg-rich-button-${b.style}` : '';
    const badge = kindBadge({ ...b, url: b.url ?? '' } as unknown as InlineButton);
    return `<span class="tg-rich-button${style}">${escapeHtml(b.text)} ${badge}</span>`;
  }).join('')}</div>`;
}

function alignToJustify(a?: 'left' | 'center' | 'right'): string {
  if (a === 'center') return 'center';
  if (a === 'right') return 'flex-end';
  return 'flex-start';
}

function renderCaption(caption?: RichBlockCaption): string {
  if (!caption?.text && !caption?.credit) return '';
  return `<figcaption class="tg-rich-caption">${escapeHtml(caption.text ?? '')}${caption.credit ? ` — <cite>${escapeHtml(caption.credit)}</cite>` : ''}</figcaption>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatText(text: string): string {
  // Block text is plain but supports inline markdown wraps (**bold**,
  // *italic*, ~strike~, `code`, ||spoiler||) plus `>`-prefixed lines that
  // render as Telegram-style quote blocks (colored left bar, no visible >).
  const lines = text.split('\n');
  const out: string[] = [];
  let quoteBuffer: string[] = [];
  const flushQuote = () => {
    if (quoteBuffer.length === 0) return;
    const inner = quoteBuffer
      .map((l) => applyInlineFormatting(escapeHtml(l)))
      .join('<br/>');
    out.push(`<blockquote class="tg-rich-bq">${inner}</blockquote>`);
    quoteBuffer = [];
  };
  for (const raw of lines) {
    const quoteMatch = /^\s*>\s?(.*)$/.exec(raw);
    if (quoteMatch) {
      quoteBuffer.push(quoteMatch[1]);
    } else {
      flushQuote();
      out.push(applyInlineFormatting(escapeHtml(raw)));
    }
  }
  flushQuote();
  return out.join('<br/>');
}

/**
 * Turn markdown-style inline wraps in an already-escaped string into HTML.
 * Runs bold before italic so `**text**` doesn't get eaten as italic.
 */
function applyInlineFormatting(escaped: string): string {
  return escaped
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<i>$1</i>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\|\|([^\n]+?)\|\|/g, '<tg-spoiler>$1</tg-spoiler>');
}

function normalizeTelegramText(text: string): string {
  return text.trim().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/\n/g, '<br/>');
}

function escapeHtml(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
