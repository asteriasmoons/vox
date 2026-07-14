import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { Channel } from '../types/post';

export function channelCard(channel: Channel): string {
  const initial = channel.name.charAt(0).toUpperCase();
  const bgColor = channel.avatarColor || '#8000fe';
  const username = channel.username ? `@${channel.username}` : '';
  const members = channel.memberCount != null ? channel.memberCount.toLocaleString() : '—';
  const defaultBadge = channel.isDefault
    ? '<span class="ch-badge-default">DEFAULT</span>'
    : '';
  const starClass = channel.isFavorite ? 'star-btn active' : 'star-btn';

  return `
    <div class="ch-card" data-channel-id="${channel.id}">
      <div class="ch-top">
        <div class="ch-avatar" style="background:${bgColor}">${initial}</div>
        <div class="ch-info">
          <strong>${channel.name}</strong>
          ${username ? `<span class="ch-username">${username}</span>` : ''}
          <span class="ch-meta">Members: ${members}</span>
          ${defaultBadge}
        </div>
        <button class="${starClass}" data-favorite-channel="${channel.id}">&#9733;</button>
      </div>
      <div class="ch-actions">
        <button class="small-action" data-channel-action="set-default">Set Default</button>
        <button class="small-action danger" data-channel-action="remove">Remove</button>
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
          <input type="text" id="channel-search" class="input" placeholder="Search channels..." style="flex:1;" />
          <button class="small-action" id="refresh-channels-btn" style="white-space:nowrap;">Refresh</button>
        </div>
      `)}
      ${GlassCard(`<div id="channels-list" class="list-stack"><p class="muted">Loading channels...</p></div>`)}
      ${GlassCard(`
        <h3>Add Channel</h3>
        <p style="margin:4px 0 12px;color:rgba(247,237,255,0.52);font-size:0.86rem;">Enter a channel @username or chat ID. The bot must be added as an admin first.</p>
        <div class="toolbar-row">
          <input type="text" id="discover-input" class="input" placeholder="@yourchannel or -1001234567890" style="flex:1;" />
          <button class="primary-action" id="discover-btn" style="width:auto;min-width:100px;">Add</button>
        </div>
        <div id="discover-status" style="margin-top:8px;font-size:0.84rem;"></div>
      `)}
    </main>
  `;
}
