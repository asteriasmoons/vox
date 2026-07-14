import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { Draft, Channel } from '../types/post';

export function draftCard(draft: Draft, channels: Channel[]): string {
  const channel = channels.find(c => c.id === draft.channelId);
  const channelName = channel ? channel.name : 'No channel';
  const starClass = draft.isFavorite ? 'star-btn active' : 'star-btn';
  const tags = (draft.tags || [])
    .map(t => `<span class="tag-pill">${t}</span>`)
    .join('');
  const now = Date.now();
  const updated = new Date(draft.updatedAt).getTime();
  const diffMs = now - updated;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  let relative = 'just now';
  if (diffDay > 0) relative = `${diffDay}d ago`;
  else if (diffHr > 0) relative = `${diffHr}h ago`;
  else if (diffMin > 0) relative = `${diffMin}m ago`;

  const preview = draft.text.length > 60 ? draft.text.slice(0, 60) + '...' : draft.text;

  return `
    <div class="draft-card" data-draft-id="${draft.id}">
      <input type="checkbox" class="draft-checkbox" />
      <button class="${starClass}" data-favorite-draft="${draft.id}">&#9733;</button>
      <div class="draft-body">
        <strong>${draft.title}</strong>
        <p class="draft-preview">${preview}</p>
        <div class="draft-meta">
          <span>${channelName}</span>
          <span>·</span>
          <time>${relative}</time>
          <span class="status-badge status-${draft.status}">${draft.status}</span>
        </div>
        ${tags ? `<div class="tag-row">${tags}</div>` : ''}
      </div>
    </div>
  `;
}

export function DraftsPage(): string {
  return `
    ${Header('Drafts', 'Saved announcements waiting for their moment.')}
    <main class="page-stack">
      ${GlassCard(`
        <input type="text" id="draft-search" class="input" placeholder="Search drafts..." />
        <div class="filter-tabs" style="margin-top:10px;">
          <button class="filter-tab active" data-filter="all">All</button>
          <button class="filter-tab" data-filter="favorites">Favorites</button>
          <button class="filter-tab" data-filter="archived">Archived</button>
          <button class="filter-tab" data-filter="trashed">Trashed</button>
        </div>
        <div class="filter-tabs" style="margin-top:8px;">
          <button class="filter-tab active" data-sort="newest">Newest</button>
          <button class="filter-tab" data-sort="oldest">Oldest</button>
          <button class="filter-tab" data-sort="title-az">A → Z</button>
          <button class="filter-tab" data-sort="title-za">Z → A</button>
        </div>
      `)}
      <div class="bulk-bar hidden" id="bulk-bar">
        <span id="bulk-count">0 selected</span>
        <button class="small-action" data-bulk="archive">Archive</button>
        <button class="small-action" data-bulk="favorite">Favorite</button>
        <button class="small-action danger" data-bulk="delete">Delete</button>
      </div>
      ${GlassCard(`<div id="drafts-list" class="list-stack"><p class="muted">Loading drafts...</p></div>`)}
    </main>
  `;
}
