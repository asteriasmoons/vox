import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { Channel } from '../types/post';

export function channelCard(channel: Channel): string {
  const initial = (channel.name || channel.username || '?').charAt(0).toUpperCase();
  const bgColor = channel.avatarColor || '#8000fe';
  const username = channel.username ? `@${channel.username}` : '';
  const members = channel.memberCount != null ? channel.memberCount.toLocaleString() : '—';
  const sourceBadge = channel.source
    ? `<span class="ch-badge-source">${channel.source}</span>`
    : '';
  const defaultBadge = channel.isDefault
    ? '<span class="ch-badge-default">DEFAULT</span>'
    : '';
  const accessLabel = channel.accessStatus === 'admin'
    ? 'Admin access'
    : channel.accessStatus === 'not_admin'
      ? 'Accessible, not admin'
      : channel.accessStatus === 'inaccessible'
        ? 'No bot access'
        : channel.accessStatus === 'unresolved'
          ? 'Needs sync'
          : 'Accessible';
  const accessClass = channel.botCanAccess ? 'ok' : 'warn';
  const starClass = channel.isFavorite ? 'star-btn active' : 'star-btn';
  const removeButton = channel.source === 'default'
    ? ''
    : '<button class="small-action danger" data-channel-action="remove">Remove</button>';
  const avatar = channel.photoUrl
    ? `<img class="ch-photo" src="${channel.photoUrl}" alt="" />`
    : `<div class="ch-avatar" style="background:${bgColor}">${initial}</div>`;

  return `
    <div class="ch-card" data-channel-id="${channel.id}">
      <div class="ch-top">
        ${avatar}
        <div class="ch-info">
          <strong>${channel.name}</strong>
          ${username ? `<span class="ch-username">${username}</span>` : ''}
          ${channel.description ? `<p class="ch-description">${channel.description}</p>` : ''}
          <span class="ch-meta">Members: ${members}</span>
          <span class="ch-access ${accessClass}">${accessLabel}</span>
          <div class="ch-badges">${sourceBadge}${defaultBadge}</div>
        </div>
        <button class="${starClass}" data-favorite-channel="${channel.id}">&#9733;</button>
      </div>
      <div class="ch-actions">
        <button class="small-action" data-channel-action="set-default">Set Default</button>
        ${removeButton}
      </div>
    </div>
  `;
}

export function ChannelsPage(): string {
  return `
    ${Header('Channels', 'Manage your Telegram channel connections.')}
    <main class="page-stack">
      ${GlassCard(`
        <div class="channel-picker-shell">
          <div class="channel-picker-heading">
            <div>
              <h3>Active Channel</h3>
              <p>Choose from channels the bot can currently publish to.</p>
            </div>
            <button class="small-action" id="refresh-channels-btn" type="button">Sync</button>
          </div>
          <label class="channel-picker-label" for="channel-picker">Current bot channel</label>
          <div class="channel-select-wrap">
            <select id="channel-picker" class="channel-select" disabled>
              <option>Loading channels...</option>
            </select>
            <span class="channel-select-icon" aria-hidden="true">⌄</span>
          </div>
          <div id="channel-picker-status" class="channel-picker-status">Checking bot access...</div>
        </div>
      `)}
      ${GlassCard(`<div class="selected-channel-heading"><span class="selected-channel-kicker">Selected channel</span></div>`, 'selected-channel-heading-card')}
      ${GlassCard(`<div id="selected-channel-detail" class="channel-detail-empty"><p class="muted">Select a channel to view connection details.</p></div>`)}
      ${GlassCard(`
        <h3>Add Channel</h3>
        <p class="channel-add-copy">Enter a public channel username or numeric Telegram channel ID. The bot must be able to access the channel.</p>
        <div class="toolbar-row">
          <input type="text" id="discover-input" class="input" placeholder="@voxapps or -1001234567890" />
          <button class="primary-action" id="discover-btn" type="button">Verify & Add</button>
        </div>
        <div id="discover-status" class="channel-picker-status"></div>
      `)}
      ${GlassCard(`<div id="channels-list" class="list-stack"><p class="muted">Loading channels...</p></div>`)}
    </main>
  `;
}
