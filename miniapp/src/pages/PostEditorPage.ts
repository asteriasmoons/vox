import { ButtonBuilder } from '../components/ButtonBuilder';
import { GlassCard } from '../components/GlassCard';
import { Header } from '../components/Header';
import { PostPreview } from '../components/PostPreview';
import { RichTextToolbar } from '../components/RichTextToolbar';
import type { Channel, InlineButtonRows, PostPayload } from '../types/post';

export interface EditorState {
  title: string;
  channelId: string;
  text: string;
  buttons: InlineButtonRows;
  channels: Channel[];
}

export const initialEditorState: EditorState = {
  title: '',
  channelId: '',
  text: '',
  buttons: [[{ text: 'Open App', url: 'https://example.com' }]],
  channels: []
};

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
    updatedAt: now
  };
}

export function PostEditorPage(state: EditorState): string {
  return `
    <button class="back-button" data-page="dashboard" type="button" aria-label="Back to home">
      <span aria-hidden="true">←</span>
      <span>Home</span>
    </button>
    ${Header('Post Editor', 'Compose rich Telegram announcements with inline buttons.')}
    <main class="page-stack editor-grid">
      ${GlassCard(`
        <label class="field-label">Title</label>
        <input id="post-title" class="input" value="${state.title}" placeholder="Launch update, beta invite, weekly note..." />

        <label class="field-label">Channel</label>
        <div class="editor-channel-select-wrap">
          <select id="channel-id" class="input editor-channel-select">
            <option value="">Loading bot channels...</option>
            ${state.channels
              .map((channel) => `<option value="${channel.id}" ${channel.id === state.channelId ? 'selected' : ''}>${channel.name}</option>`)
              .join('')}
          </select>
          <span class="editor-channel-select-icon" aria-hidden="true">⌄</span>
        </div>
        <p id="editor-channel-status" class="editor-channel-status">Loading channels the bot can access...</p>
        <div id="editor-channel-preview" class="editor-channel-preview"></div>

        <label class="field-label">Announcement</label>
        ${RichTextToolbar()}
        <textarea id="post-text" class="editor-textarea" placeholder="Write your announcement..."></textarea>
      `, 'editor-card')}

      ${GlassCard(ButtonBuilder(state.buttons), 'builder-card')}

      ${GlassCard(`
        <div class="section-heading">
          <div>
            <h3>Live Preview</h3>
            <p>Exactly how your message will look in Telegram.</p>
          </div>
        </div>
        <div id="preview-root">${PostPreview(state.text, state.buttons, state.title)}</div>
      `, 'preview-card')}

      <div class="editor-actions">
        <button class="secondary-action" id="save-draft">Save Draft</button>
        <button class="secondary-action" id="schedule-btn">Schedule</button>
        <button class="primary-action" id="publish-now">Publish Now</button>
      </div>
    </main>
  `;
}
