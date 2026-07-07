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
    <button class="back-button" data-page="dashboard" type="button">← Back</button>
    ${Header('Post Editor', 'Compose rich Telegram announcements with inline buttons.')}
    <main class="page-stack editor-grid">
      ${GlassCard(`
        <label class="field-label">Title</label>
        <input id="post-title" class="input" value="${state.title}" placeholder="Launch update, beta invite, weekly note..." />

        <label class="field-label">Channel</label>
        <select id="channel-id" class="input">
          <option value="">Choose a channel</option>
          ${state.channels
            .map((channel) => `<option value="${channel.id}" ${channel.id === state.channelId ? 'selected' : ''}>${channel.name}</option>`)
            .join('')}
        </select>

        <label class="field-label">Announcement</label>
        ${RichTextToolbar()}
        <textarea id="post-text" class="editor-textarea" placeholder="Write your announcement..."></textarea>
      `, 'editor-card')}

      ${GlassCard(ButtonBuilder(state.buttons), 'builder-card')}

      ${GlassCard(`
        <div class="section-heading">
          <div>
            <h3>Live Preview</h3>
            <p>What your Telegram post will feel like.</p>
          </div>
        </div>
        <div id="preview-root">${PostPreview(state.text, state.buttons)}</div>
      `, 'preview-card')}

      <div class="editor-actions">
        <button class="secondary-action" id="save-draft">Save Draft</button>
        <button class="primary-action" id="publish-now">Publish Now</button>
      </div>
    </main>
  `;
}
