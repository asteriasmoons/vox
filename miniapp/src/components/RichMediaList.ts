import type { InputMedia, RichMediaRef } from '../types/post';

/**
 * The media library shown alongside the HTML and Markdown editors. Add a
 * photo / video / document / audio here, give it a short id, then reference
 * it from the body as tg://photo?id=<id> (or tg://video, tg://document,
 * tg://audio). A message can carry up to 50 media items.
 */

const MEDIA_TYPE_OPTIONS: InputMedia['type'][] = ['photo', 'video', 'animation', 'audio', 'document', 'voice_note'];

const TYPE_LABELS: Record<InputMedia['type'], string> = {
  photo: 'Photo',
  video: 'Video',
  animation: 'Animation (GIF)',
  audio: 'Audio',
  document: 'Document',
  voice_note: 'Voice Note'
};

/**
 * Which tg:// URL to use for each media type. Photos, videos, documents and
 * audio each have their own scheme; animations use the video scheme and voice
 * notes use the audio scheme (that's how Telegram groups them).
 */
const SCHEME_FOR_TYPE: Record<InputMedia['type'], 'photo' | 'video' | 'document' | 'audio'> = {
  photo: 'photo',
  video: 'video',
  animation: 'video',
  audio: 'audio',
  document: 'document',
  voice_note: 'audio'
};

export function referenceLinkFor(ref: RichMediaRef): string {
  const scheme = SCHEME_FOR_TYPE[ref.media.type];
  return `tg://${scheme}?id=${encodeURIComponent(ref.id)}`;
}

export function RichMediaList(media: RichMediaRef[]): string {
  return `
    <div class="rich-media-list">
      <div class="section-heading">
        <div>
          <h3>Media Library</h3>
          <p>Referenced from HTML/Markdown as <code>tg://&lt;type&gt;?id=…</code>.</p>
        </div>
        <button type="button" class="small-action" data-rich-media-add>Add Media</button>
      </div>
      <div class="rich-media-items">
        ${media.map((ref, index) => renderMedia(ref, index)).join('')}
        ${media.length === 0 ? '<p class="muted">No media yet. Add a photo/video/document/audio and reference it by id in the message body.</p>' : ''}
      </div>
    </div>
  `;
}

function renderMedia(ref: RichMediaRef, index: number): string {
  const link = referenceLinkFor(ref);
  const captionValue = ref.media.caption ?? '';
  const hasSpoiler = (ref.media.type === 'photo' || ref.media.type === 'video' || ref.media.type === 'animation') && Boolean((ref.media as { hasSpoiler?: boolean }).hasSpoiler);
  const showAbove = Boolean(ref.media.showCaptionAboveMedia);
  return `
    <div class="rich-media-item" data-rich-media-index="${index}">
      <div class="rich-media-item-top">
        <input data-rich-media-field="id" value="${escapeAttr(ref.id)}" placeholder="media-id (A–Z, a–z, 0–9, _-)" />
        <select data-rich-media-type class="input">
          ${MEDIA_TYPE_OPTIONS.map((t) => `<option value="${t}"${t === ref.media.type ? ' selected' : ''}>${TYPE_LABELS[t]}</option>`).join('')}
        </select>
        <button type="button" data-rich-media-remove aria-label="Remove media">Remove</button>
      </div>
      <input data-rich-media-field="media" value="${escapeAttr(ref.media.media)}" placeholder="file_id, https://… URL, or attach://<name>" />
      <textarea data-rich-media-field="caption" placeholder="Optional caption (0–1024)">${escapeText(captionValue)}</textarea>
      <div class="rich-media-flags">
        ${['photo', 'video', 'animation'].includes(ref.media.type) ? `
          <label><input type="checkbox" data-rich-media-flag="hasSpoiler" ${hasSpoiler ? 'checked' : ''} /> Spoiler</label>
        ` : ''}
        <label><input type="checkbox" data-rich-media-flag="showCaptionAboveMedia" ${showAbove ? 'checked' : ''} /> Caption above media</label>
      </div>
      <p class="rich-media-ref"><span class="muted">Reference:</span> <code>${escapeText(link)}</code></p>
    </div>
  `;
}

function escapeAttr(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeText(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
