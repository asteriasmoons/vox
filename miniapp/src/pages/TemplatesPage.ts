import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { Template } from '../types/post';

const CATEGORIES = [
  'All', 'announcement', 'update', 'patch-notes', 'release',
  'maintenance', 'giveaway', 'contest', 'news', 'beta', 'reminder', 'custom',
];

export function templateCard(template: Template): string {
  const starClass = template.isFavorite ? 'star-btn filled' : 'star-btn';
  const preview = template.text.length > 80
    ? template.text.slice(0, 80) + '...'
    : template.text;
  const builtInBadge = template.isBuiltIn
    ? '<span class="status-badge status-built-in">Built-in</span>'
    : '';
  const deleteBtn = template.isBuiltIn
    ? ''
    : '<button class="small-action" data-template-action="delete">Delete</button>';

  return `
    <div class="template-card glass-card" data-template-id="${template.id}">
      <span class="category-badge">${template.category}</span>
      ${builtInBadge}
      <strong>${template.name}</strong>
      <p class="muted template-preview">${preview}</p>
      <button class="${starClass}" data-favorite-template="${template.id}">&#9733;</button>
      <div class="action-row">
        <button class="small-action" data-template-action="use">Use</button>
        <button class="small-action" data-template-action="duplicate">Duplicate</button>
        ${deleteBtn}
      </div>
    </div>
  `;
}

export function TemplatesPage(): string {
  const pills = CATEGORIES
    .map((cat, i) => {
      const active = i === 0 ? ' active' : '';
      return `<button class="filter-pill${active}" data-category="${cat.toLowerCase()}">${cat}</button>`;
    })
    .join('');

  return `
    ${Header('Templates', 'Quick-start your announcements with ready-made formats.')}
    <main class="page-stack">
      ${GlassCard(`
        <input type="text" id="template-search" class="input" placeholder="Search templates..." />
        <div class="pill-scroll">${pills}</div>
      `)}
      ${GlassCard(`<div id="templates-list" class="templates-grid"><p class="muted">Loading templates...</p></div>`)}
    </main>
  `;
}
