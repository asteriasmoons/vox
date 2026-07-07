import { BottomNav } from './components/BottomNav';
import { DashboardPage } from './pages/DashboardPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { DraftsPage } from './pages/DraftsPage';
import { initialEditorState, PostEditorPage, type EditorState } from './pages/PostEditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './utils/api';
import { insertAtCursor, wrapSelection } from './utils/formatting';
import { qs } from './utils/dom';
import type { Channel, Draft, InlineButtonRows, PostPayload } from './types/post';

export type PageName = 'dashboard' | 'editor' | 'channels' | 'drafts' | 'settings';

interface AppState {
  page: PageName;
  editor: EditorState;
}

const state: AppState = {
  page: 'dashboard',
  editor: { ...initialEditorState }
};

export async function render(page: PageName = state.page): Promise<void> {
  state.page = page;

  if (page === 'editor' && state.editor.channels.length === 0) {
    state.editor.channels = await api.getChannels();
    state.editor.channelId = state.editor.channelId || state.editor.channels[0]?.id || '';
  }

  const root = qs<HTMLDivElement>('#app');
  const pageHtml = getPageHtml(page);
  root.innerHTML = `<div class="app-shell">${pageHtml}${BottomNav(page)}</div>`;

  bindNavigation();
  await hydratePage(page);
}

function getPageHtml(page: PageName): string {
  const pages: Record<PageName, string> = {
    dashboard: DashboardPage(),
    editor: PostEditorPage(state.editor),
    channels: ChannelsPage(),
    drafts: DraftsPage(),
    settings: SettingsPage()
  };

  return pages[page];
}

function bindNavigation(): void {
  document.querySelectorAll<HTMLElement>('[data-page]').forEach((element) => {
    element.addEventListener('click', () => {
      const page = element.dataset.page as PageName;
      void render(page);
    });
  });
}

async function hydratePage(page: PageName): Promise<void> {
  if (page === 'dashboard') await hydrateDashboard();
  if (page === 'channels') await hydrateChannels();
  if (page === 'drafts') await hydrateDrafts();
  if (page === 'editor') bindEditor();
}

async function hydrateDashboard(): Promise<void> {
  const [drafts, channels, posts] = await Promise.all([api.getDrafts(), api.getChannels(), api.getPosts()]);
  qs('#draft-count').textContent = String(drafts.length);
  qs('#channel-count').textContent = String(channels.length);
  qs('#posted-count').textContent = String(posts.length);
}

async function hydrateChannels(): Promise<void> {
  const channels = await api.getChannels();
  const list = qs('#channels-list');
  list.innerHTML = channels.map(channelCard).join('') || '<p class="muted">No channels yet.</p>';
}

function channelCard(channel: Channel): string {
  return `<article class="list-card"><strong>${channel.name}</strong><span>${channel.telegramChatId}</span><p>${channel.description ?? ''}</p></article>`;
}

async function hydrateDrafts(): Promise<void> {
  const drafts = await api.getDrafts();
  const list = qs('#drafts-list');
  list.innerHTML = drafts.map(draftCard).join('') || '<p class="muted">No saved drafts yet.</p>';
}

function draftCard(draft: Draft): string {
  return `<article class="list-card"><strong>${draft.title}</strong><span>${new Date(draft.updatedAt).toLocaleString()}</span><p>${draft.text}</p></article>`;
}

function bindEditor(): void {
  const titleInput = qs<HTMLInputElement>('#post-title');
  const channelSelect = qs<HTMLSelectElement>('#channel-id');
  const textarea = qs<HTMLTextAreaElement>('#post-text');

  textarea.value = state.editor.text;

  titleInput.addEventListener('input', () => (state.editor.title = titleInput.value));
  channelSelect.addEventListener('change', () => (state.editor.channelId = channelSelect.value));
  textarea.addEventListener('input', () => {
    state.editor.text = textarea.value;
    refreshPreview();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-format]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.format;
      state.editor.text = applyFormat(action, textarea);
      refreshPreview();
    });
  });

  bindButtonBuilder();

  qs<HTMLButtonElement>('#save-draft').addEventListener('click', async () => {
    syncEditorFields(titleInput, channelSelect, textarea);
    await api.saveDraft(createPayload('draft'));
    alert('Draft saved.');
  });

  qs<HTMLButtonElement>('#publish-now').addEventListener('click', async () => {
    syncEditorFields(titleInput, channelSelect, textarea);
    await api.publishPost(createPayload('posted'));
    alert('Published to Telegram.');
  });
}

function syncEditorFields(titleInput: HTMLInputElement, channelSelect: HTMLSelectElement, textarea: HTMLTextAreaElement): void {
  state.editor.title = titleInput.value;
  state.editor.channelId = channelSelect.value;
  state.editor.text = textarea.value;
}

function createPayload(status: PostPayload['status']): PostPayload {
  const now = new Date().toISOString();
  return {
    title: state.editor.title.trim() || 'Untitled Announcement',
    channelId: state.editor.channelId,
    text: state.editor.text,
    parseMode: 'HTML',
    buttons: state.editor.buttons,
    status,
    createdAt: now,
    updatedAt: now
  };
}

function applyFormat(action: string | undefined, textarea: HTMLTextAreaElement): string {
  switch (action) {
    case 'bold': return wrapSelection(textarea, '<b>', '</b>');
    case 'italic': return wrapSelection(textarea, '<i>', '</i>');
    case 'underline': return wrapSelection(textarea, '<u>', '</u>');
    case 'strike': return wrapSelection(textarea, '<s>', '</s>');
    case 'code': return wrapSelection(textarea, '<code>', '</code>');
    case 'quote': return insertAtCursor(textarea, '\n<blockquote>Quote text</blockquote>\n');
    case 'spoiler': return wrapSelection(textarea, '<tg-spoiler>', '</tg-spoiler>');
    case 'divider': return insertAtCursor(textarea, '\n━━━━━━━━━━━━\n');
    default: return textarea.value;
  }
}

function bindButtonBuilder(): void {
  qs<HTMLButtonElement>('#add-button-row').addEventListener('click', () => {
    state.editor.buttons.push([{ text: '', url: '' }]);
    void render('editor');
  });

  document.querySelectorAll<HTMLInputElement>('[data-button-field]').forEach((input) => {
    input.addEventListener('input', () => updateButtonFromInput(input));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-add-button]').forEach((button) => {
    button.addEventListener('click', () => {
      const rowIndex = Number(button.dataset.addButton);
      state.editor.buttons[rowIndex].push({ text: '', url: '' });
      void render('editor');
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-remove-row]').forEach((button) => {
    button.addEventListener('click', () => {
      state.editor.buttons.splice(Number(button.dataset.removeRow), 1);
      if (state.editor.buttons.length === 0) state.editor.buttons.push([]);
      void render('editor');
    });
  });

  document.querySelectorAll<HTMLElement>('.builder-button').forEach((item) => {
    item.querySelector('[data-remove-button]')?.addEventListener('click', () => {
      const [rowIndex, buttonIndex] = getButtonPosition(item);
      state.editor.buttons[rowIndex].splice(buttonIndex, 1);
      void render('editor');
    });

    item.querySelector('[data-move-left]')?.addEventListener('click', () => moveButton(item, -1));
    item.querySelector('[data-move-right]')?.addEventListener('click', () => moveButton(item, 1));
  });
}

function updateButtonFromInput(input: HTMLInputElement): void {
  const parent = input.closest<HTMLElement>('.builder-button');
  if (!parent) return;

  const [rowIndex, buttonIndex] = getButtonPosition(parent);
  const field = input.dataset.buttonField as 'text' | 'url';
  state.editor.buttons[rowIndex][buttonIndex][field] = input.value;
  refreshPreview();
}

function getButtonPosition(element: HTMLElement): [number, number] {
  return [Number(element.dataset.rowIndex), Number(element.dataset.buttonIndex)];
}

function moveButton(element: HTMLElement, direction: number): void {
  const [rowIndex, buttonIndex] = getButtonPosition(element);
  const row = state.editor.buttons[rowIndex];
  const nextIndex = buttonIndex + direction;
  if (nextIndex < 0 || nextIndex >= row.length) return;

  const [button] = row.splice(buttonIndex, 1);
  row.splice(nextIndex, 0, button);
  void render('editor');
}

function refreshPreview(): void {
  const root = document.querySelector('#preview-root');
  if (!root) return;

  import('./components/PostPreview').then(({ PostPreview }) => {
    root.innerHTML = PostPreview(state.editor.text, state.editor.buttons);
  });
}
