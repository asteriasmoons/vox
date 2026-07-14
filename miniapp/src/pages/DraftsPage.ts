import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { Draft, Channel } from '../types/post';

export function draftCard(draft: Draft, channels: Channel[]): string {
  const channel = channels.find(c => c.id === draft.channelId);
  const channelName = channel ? channel.name : 'Unknown';
  const starClass = draft.isFavorite ? 'star-btn filled' : 'star-btn';
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

  return `
    <div class="draft-card list-card" data-draft-id="${draft.id}">
      <input type="checkbox" class="draft-checkbox" />
      <button class="${starClass}" data-favorite-draft="${draft.id}">&#9733;</button>
      <div class="list-card-body">
        <strong>${draft.title}</strong>
        <span class="muted">${channelName}</span>
        <div class="tag-row">${tags}</div>
        <time class="muted">${relative}</time>
        <span class="status-badge status-${draft.status}">${draft.status}</span>
      </div>
    </div>
  `;
}

export function DraftsPage(): string {
  return `
    ${Header('Drafts', 'Saved announcements waiting for their moment.')}
    <main class="page-stack">
      ${GlassCard(`
        <div class="toolbar-row">
          <input type="text" id="draft-search" class="input" placeholder="Search drafts..." />
          <select id="draft-sort" class="input">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title-az">Title A-Z</option>
            <option value="title-za">Title Z-A</option>
          </select>
        </div>
        <div class="filter-tabs">
          <button class="filter-tab active" data-filter="all">All</button>
          <button class="filter-tab" data-filter="favorites">Favorites</button>
          <button class="filter-tab" data-filter="archived">Archived</button>
          <button class="filter-tab" data-filter="trashed">Trashed</button>
        </div>
      `)}
      <div class="bulk-bar hidden" id="bulk-bar">
        <button class="small-action" data-bulk="archive">Archive</button>
        <button class="small-action" data-bulk="favorite">Favorite</button>
        <button class="small-action" data-bulk="delete">Delete</button>
      </div>
      ${GlassCard(`<div id="drafts-list" class="list-stack"><p class="muted">Loading drafts...</p></div>`)}
    </main>
  `;
}
