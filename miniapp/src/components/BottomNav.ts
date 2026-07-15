import type { PageName } from '../router';

const mainItems: Array<{ page: PageName; label: string; icon: string }> = [
  { page: 'dashboard', label: 'Home', icon: '/icons/home-2-remix.svg' },
  { page: 'channels', label: 'Channels', icon: '/icons/slack-circle.svg' },
  { page: 'drafts', label: 'Drafts', icon: '/icons/pencilburst.svg' },
  { page: 'calendar', label: 'Calendar', icon: '/icons/ringstarcal.svg' },
  { page: 'more', label: 'More', icon: '/icons/dots-waves-solid.svg' }
];

const moreItems: Array<{ page: PageName; label: string; icon: string }> = [
  { page: 'analytics', label: 'Analytics', icon: '/icons/starbars.svg' },
  { page: 'templates', label: 'Templates', icon: '/icons/pointpencil.svg' },
  { page: 'settings', label: 'Settings', icon: '/icons/settingsknobs.svg' }
];

export function BottomNav(active: PageName): string {
  const isMoreActive = moreItems.some((item) => item.page === active) || active === 'more';

  return `
    <nav class="bottom-nav">
      ${mainItems
        .map((item) => {
          const isActive = item.page === 'more'
            ? isMoreActive
            : active === item.page;

          const attrs = item.page === 'more'
            ? 'data-toggle-more'
            : `data-page="${item.page}"`;

          return `
            <button class="nav-item ${isActive ? 'active' : ''}" ${attrs}>
              <img class="nav-icon" src="${item.icon}" alt="" aria-hidden="true" />
              <small>${item.label}</small>
            </button>`;
        })
        .join('')}
    </nav>
    <div class="more-menu" id="more-menu">
      <div class="more-menu-backdrop" data-close-more></div>
      <div class="more-menu-panel">
        ${moreItems
          .map(
            (item) => `
            <button class="more-menu-item ${active === item.page ? 'active' : ''}" data-page="${item.page}">
              <img class="nav-icon" src="${item.icon}" alt="" aria-hidden="true" />
              <span>${item.label}</span>
            </button>`
          )
          .join('')}
      </div>
    </div>
  `;
}
