import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { Template } from '../types/post';

const CATEGORIES = [
  'All', 'announcement', 'update', 'patch-notes', 'release',
  'maintenance', 'giveaway', 'contest', 'news', 'beta', 'reminder', 'custom',
];

export function templateCard(template: Template): string {
  const starClass = template.isFavorite ? 'star-btn active' : 'star-btn';
  const preview = template.text.length > 100
    ? template.text.slice(0, 100) + '...'
    : template.text;
  const builtInBadge = template.isBuiltIn
    ? '<span class="tpl-built-in">Built-in</span>'
    : '';
  const deleteBtn = template.isBuiltIn
    ? ''
    : '<button class="small-action danger" data-template-action="delete">Delete</button>';

  const catClass = `category-${template.category}`;

  return `
    <div class="tpl-card" data-template-id="${template.id}">
      <div class="tpl-header">
        <span class="category-badge ${catClass}">${template.category}</span>
        ${builtInBadge}
      </div>
      <strong class="tpl-name">${template.name}</strong>
      <p class="tpl-preview">${preview}</p>
      <button class="${starClass}" data-favorite-template="${template.id}">&#9733;</button>
      <div class="tpl-actions">
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
      return `<button class="filter-tab${active}" data-category="${cat.toLowerCase()}">${cat}</button>`;
    })
    .join('');

  return `
    ${Header('Templates', 'Quick-start your announcements with ready-made formats.')}
    <main class="page-stack">
      ${GlassCard(`
        <input type="text" id="template-search" class="input" placeholder="Search templates..." />
        <div class="filter-tabs" style="margin-top:10px;">${pills}</div>
      `)}
      ${GlassCard(`<div id="templates-list" class="tpl-grid"><p class="muted">Loading templates...</p></div>`)}
    </main>
  `;
}
