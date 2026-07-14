import type { PageName } from '../router';

const items: Array<{ page: PageName; label: string; icon: string }> = [
  { page: 'dashboard', label: 'Home', icon: '/icons/home-2-remix.svg' },
  { page: 'channels', label: 'Channels', icon: '/icons/slack-circle.svg' },
  { page: 'drafts', label: 'Drafts', icon: '/icons/pencilburst.svg' },
  { page: 'settings', label: 'Settings', icon: '/icons/cog-one-solid.svg' }
];

export function BottomNav(active: PageName): string {
  return `
    <nav class="bottom-nav">
      ${items
        .map(
          (item) => `
          <button class="nav-item ${active === item.page ? "active" : ""}" data-page="${item.page}">
            <img class="nav-icon" src="${item.icon}" alt="" aria-hidden="true" />
            <small>${item.label}</small>
          </button>`,
        )
        .join("")}
    </nav>
  `;
}
