import { ButtonBuilder } from '../components/ButtonBuilder';
import { GlassCard } from '../components/GlassCard';
import { Header } from '../components/Header';
import { PostPreview } from '../components/PostPreview';
import { RichBlockBuilder } from '../components/RichBlockBuilder';
import { RichMediaList } from '../components/RichMediaList';
import { RichTextToolbar } from '../components/RichTextToolbar';
import type {
  Channel,
  InlineButtonRows,
  PostMode,
  PostPayload,
  RichBlock,
  RichFlavor,
  RichMediaRef,
  RichMessage
} from '../types/post';

export interface EditorState {
  draftId?: string;
  title: string;
  channelId: string;
  text: string;
  buttons: InlineButtonRows;
  channels: Channel[];
  mode: PostMode;
  richFlavor: RichFlavor;
  richHtml: string;
  richMarkdown: string;
  richBlocks: RichBlock[];
  richMedia: RichMediaRef[];
  richIsRtl: boolean;
  richSkipEntityDetection: boolean;
}

export const initialEditorState: EditorState = {
  title: '',
  channelId: '',
  text: '',
  buttons: [[{ text: 'Open App', url: 'https://example.com', kind: 'url' }]],
  channels: [],
  mode: 'regular',
  richFlavor: 'html',
  richHtml: '',
  richMarkdown: '',
  richBlocks: [],
  richMedia: [],
  richIsRtl: false,
  richSkipEntityDetection: false
};

export function buildRichMessage(state: EditorState): RichMessage {
  const rich: RichMessage = { flavor: state.richFlavor };
  if (state.richFlavor === 'html') rich.html = state.richHtml;
  if (state.richFlavor === 'markdown') rich.markdown = state.richMarkdown;
  if (state.richFlavor === 'blocks') rich.blocks = state.richBlocks;
  if (state.richFlavor !== 'blocks' && state.richMedia.length > 0) rich.media = state.richMedia;
  if (state.richIsRtl) rich.isRtl = true;
  if (state.richSkipEntityDetection) rich.skipEntityDetection = true;
  return rich;
}

export function createPayload(state: EditorState, status: PostPayload['status']): PostPayload {
  const now = new Date().toISOString();
  return {
    title: state.title.trim() || 'Untitled Announcement',
    channelId: state.channelId,
    text: state.text,
    parseMode: 'HTML',
    buttons: state.buttons,
    status,
    createdAt: now,
    updatedAt: now,
    mode: state.mode,
    rich: state.mode === 'rich' ? buildRichMessage(state) : undefined
  };
}

export function PostEditorPage(state: EditorState): string {
  // Dropdown shows the friendly name; the value we store is the Telegram
  // numeric chat id, so the payload can talk to Telegram straight through.
  const selectedChannel = state.channels.find((channel) => channel.telegramChatId === state.channelId);

  return `
    <button class="back-button" data-page="dashboard" type="button" aria-label="Back to home">
      <span aria-hidden="true">←</span>
      <span>Home</span>
    </button>
    ${Header('Post Editor', 'Compose regular or rich Telegram announcements with inline buttons.')}
    <main class="page-stack editor-grid">
      ${GlassCard(modeToggle(state), 'mode-toggle-card')}
      ${GlassCard(`
        <label class="field-label">Title</label>
        <input id="post-title" class="input" value="${escapeAttr(state.title)}" placeholder="Launch update, beta invite, weekly note..." />

        <label class="field-label">Channel</label>
        <div class="editor-channel-select-wrap">
          <select id="channel-id" class="input editor-channel-select">
            <option value="">Loading bot channels...</option>
            ${state.channels
              .map((channel) => `<option value="${channel.telegramChatId}" ${channel.telegramChatId === state.channelId ? 'selected' : ''}>${escapeAttr(channel.name)}</option>`)
              .join('')}
          </select>
          <span class="editor-channel-select-icon" aria-hidden="true">⌄</span>
        </div>
        <p id="editor-channel-status" class="editor-channel-status">Loading channels the bot can access...</p>
        <div id="editor-channel-preview" class="editor-channel-preview"></div>

        ${state.mode === 'regular' ? regularBody(state) : richBody(state)}
      `, 'editor-card')}

      ${GlassCard(ButtonBuilder(state.buttons), 'builder-card')}

      ${GlassCard(`
        <div class="section-heading">
          <div>
            <h3>Live Preview</h3>
            <p>Best-effort visual — Telegram may render some blocks differently.</p>
          </div>
        </div>
        <div id="preview-root">${PostPreview(state.text, state.buttons, {
          channelName: selectedChannel?.name,
          mode: state.mode,
          rich: state.mode === 'rich' ? buildRichMessage(state) : undefined
        })}</div>
      `, 'preview-card')}

      <div class="editor-actions">
        <button class="secondary-action" id="save-draft">Save Draft</button>
        <button class="secondary-action" id="schedule-btn">Schedule</button>
        <button class="primary-action" id="publish-now">Publish Now</button>
      </div>
    </main>
  `;
}

function modeToggle(state: EditorState): string {
  return `
    <div class="mode-tabs" role="tablist" aria-label="Post mode">
      <button type="button" role="tab" data-post-mode="regular" class="mode-tab ${state.mode === 'regular' ? 'active' : ''}" aria-selected="${state.mode === 'regular'}">Regular Post</button>
      <button type="button" role="tab" data-post-mode="rich" class="mode-tab ${state.mode === 'rich' ? 'active' : ''}" aria-selected="${state.mode === 'rich'}">Rich Message</button>
    </div>
    <p class="mode-tab-hint">
      ${state.mode === 'regular'
        ? 'Sends via sendMessage with HTML parse mode.'
        : 'Sends via sendRichMessage (Bot API 10.3). Choose a content flavor below.'}
    </p>
  `;
}

function regularBody(state: EditorState): string {
  return `
    <label class="field-label">Announcement</label>
    ${RichTextToolbar()}
    <textarea id="post-text" class="editor-textarea" placeholder="Write your announcement...">${escapeText(state.text)}</textarea>
  `;
}

function richBody(state: EditorState): string {
  return `
    <label class="field-label">Content Flavor</label>
    <div class="rich-flavor-tabs" role="tablist" aria-label="Rich content flavor">
      ${(['html', 'markdown', 'blocks'] as const).map((f) => `
        <button type="button" role="tab" data-rich-flavor="${f}" class="rich-flavor-tab ${state.richFlavor === f ? 'active' : ''}" aria-selected="${state.richFlavor === f}">${flavorLabel(f)}</button>
      `).join('')}
    </div>

    <div class="rich-flavor-body">
      ${state.richFlavor === 'html' ? richHtmlPane(state) : ''}
      ${state.richFlavor === 'markdown' ? richMarkdownPane(state) : ''}
      ${state.richFlavor === 'blocks' ? richBlocksPane(state) : ''}
    </div>

    ${state.richFlavor !== 'blocks' ? `
      <div class="rich-media-card">${RichMediaList(state.richMedia)}</div>
    ` : ''}

    <div class="rich-message-options">
      <label><input type="checkbox" id="rich-is-rtl" ${state.richIsRtl ? 'checked' : ''} /> Right-to-left</label>
      <label><input type="checkbox" id="rich-skip-entity-detection" ${state.richSkipEntityDetection ? 'checked' : ''} /> Skip automatic entity detection</label>
    </div>
  `;
}

function flavorLabel(f: RichFlavor): string {
  if (f === 'html') return 'HTML';
  if (f === 'markdown') return 'Markdown';
  return 'Blocks';
}

function richHtmlPane(state: EditorState): string {
  return `
    <label class="field-label">HTML Body</label>
    ${RichTextToolbar()}
    <textarea id="rich-html" class="editor-textarea rich-textarea" placeholder="&lt;p&gt;Write your rich message in HTML…&lt;/p&gt;&#10;Media: &lt;img src=&quot;tg://photo?id=hero&quot;&gt;">${escapeText(state.richHtml)}</textarea>
  `;
}

function richMarkdownPane(state: EditorState): string {
  return `
    <label class="field-label">Markdown Body</label>
    ${RichTextToolbar()}
    <textarea id="rich-markdown" class="editor-textarea rich-textarea" placeholder="# Headline&#10;&#10;Write your rich message in Markdown.&#10;&#10;Media: ![hero](tg://photo?id=hero)">${escapeText(state.richMarkdown)}</textarea>
  `;
}

function richBlocksPane(state: EditorState): string {
  return `
    <label class="field-label">Blocks</label>
    <div class="rich-blocks-toolbar-wrap">
      <p class="rich-blocks-toolbar-hint">Click into a block's text, then use the toolbar to format it.</p>
      <div id="rich-blocks-toolbar" class="toolbar">
        <button type="button" data-blocks-format="bold">B</button>
        <button type="button" data-blocks-format="italic">I</button>
        <button type="button" data-blocks-format="underline">U</button>
        <button type="button" data-blocks-format="strike">S</button>
        <button type="button" data-blocks-format="code">{}</button>
        <button type="button" data-blocks-format="quote">❝</button>
        <button type="button" data-blocks-format="spoiler">Spoiler</button>
        <button type="button" data-blocks-format="divider">—</button>
      </div>
    </div>
    ${RichBlockBuilder(state.richBlocks)}
  `;
}

function escapeAttr(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeText(str: string): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
