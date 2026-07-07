import type { PageName } from '../router';

const items: Array<{ page: PageName; label: string; icon: string }> = [
  { page: 'dashboard', label: 'Home', icon: '◆' },
  { page: 'editor', label: 'Editor', icon: '✦' },
  { page: 'channels', label: 'Channels', icon: '◈' },
  { page: 'drafts', label: 'Drafts', icon: '◇' },
  { page: 'settings', label: 'Settings', icon: '⚙' }
];

export function BottomNav(active: PageName): string {
  return `
    <nav class="bottom-nav">
      ${items
        .map(
          (item) => `
          <button class="nav-item ${active === item.page ? 'active' : ''}" data-page="${item.page}">
            <span>${item.icon}</span>
            <small>${item.label}</small>
          </button>`
        )
        .join('')}
    </nav>
  `;
}
