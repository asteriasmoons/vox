import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { Channel } from '../types/post';

export function channelCard(channel: Channel): string {
  const initial = channel.name.charAt(0).toUpperCase();
  const bgColor = channel.avatarColor || '#888';
  const username = channel.username ? `<span class="muted">@${channel.username}</span>` : '';
  const members = channel.memberCount != null ? channel.memberCount.toLocaleString() : '—';
  const defaultBadge = channel.isDefault
    ? '<span class="status-badge status-default">Default</span>'
    : '';
  const starClass = channel.isFavorite ? 'star-btn filled' : 'star-btn';

  return `
    <div class="channel-card list-card" data-channel-id="${channel.id}">
      <div class="avatar-circle" style="background:${bgColor}">${initial}</div>
      <div class="list-card-body">
        <strong>${channel.name}</strong>
        ${username}
        <span class="muted">ID: ${channel.telegramChatId}</span>
        <span class="muted">Members: ${members}</span>
        ${defaultBadge}
      </div>
      <button class="${starClass}" data-favorite-channel="${channel.id}">&#9733;</button>
      <div class="action-row">
        <button class="small-action" data-channel-action="edit">Edit</button>
        <button class="small-action" data-channel-action="set-default">Set Default</button>
        <button class="small-action" data-channel-action="remove">Remove</button>
      </div>
    </div>
  `;
}

export function ChannelsPage(): string {
  return `
    ${Header('Channels', 'Manage your Telegram channel connections.')}
    <main class="page-stack">
      ${GlassCard(`
        <div class="toolbar-row">
          <input type="text" id="channel-search" class="input" placeholder="Search channels..." />
          <select id="channel-sort" class="input">
            <option value="name-az">Name A-Z</option>
            <option value="name-za">Name Z-A</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
        <button class="primary-action" id="add-channel-btn">Add Channel</button>
      `)}
      ${GlassCard(`<div id="channels-list" class="list-stack"><p class="muted">Loading channels...</p></div>`)}
      <div id="add-channel-form" class="hidden">
        ${GlassCard(`
          <h2>Add Channel</h2>
          <label class="field-label">Channel Name
            <input type="text" id="new-channel-name" class="input" placeholder="My Channel" />
          </label>
          <label class="field-label">Telegram Chat ID
            <input type="text" id="new-channel-chat-id" class="input" placeholder="-1001234567890" />
          </label>
          <label class="field-label">Username (optional)
            <input type="text" id="new-channel-username" class="input" placeholder="@mychannel" />
          </label>
          <label class="field-label">Description (optional)
            <textarea id="new-channel-description" class="input" rows="3" placeholder="Channel description..."></textarea>
          </label>
          <div class="action-row">
            <button class="primary-action" id="save-channel-btn">Save</button>
            <button class="small-action" id="cancel-channel-btn">Cancel</button>
          </div>
        `)}
      </div>
    </main>
  `;
}
