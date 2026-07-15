import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';
import { Template } from '../types/post';

const CATEGORIES = [
  'All', 'announcement', 'update', 'patch-notes', 'release',
  'maintenance', 'giveaway', 'contest', 'news', 'beta', 'reminder', 'custom',
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTemplatePreview(text: string): string {
  return text
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function templateCard(template: Template): string {
  const starClass = template.isFavorite ? 'star-btn active' : 'star-btn';
  const plainPreview = plainTemplatePreview(template.text);
  const preview = plainPreview.length > 100
    ? `${plainPreview.slice(0, 100)}...`
    : plainPreview;
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
        <span class="category-badge ${catClass}">${escapeHtml(template.category)}</span>
        ${builtInBadge}
      </div>
      <strong class="tpl-name">${escapeHtml(template.name)}</strong>
      <p class="tpl-preview">${escapeHtml(preview)}</p>
      <div class="tpl-footer">
        <button class="${starClass}" data-favorite-template="${template.id}">&#9733;</button>
        <div class="tpl-actions">
          <button class="small-action" data-template-action="preview">View</button>
          <button class="small-action" data-template-action="use">Use</button>
          <button class="small-action" data-template-action="duplicate">Duplicate</button>
          ${deleteBtn}
        </div>
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
    <div id="template-preview-modal" class="tpl-modal" style="display:none;">
      <div class="tpl-modal-backdrop" id="tpl-modal-close"></div>
      <div class="tpl-modal-panel">
        <div class="tpl-modal-header">
          <strong id="tpl-modal-title"></strong>
          <button class="small-action" id="tpl-modal-close-btn">Close</button>
        </div>
        <div id="tpl-modal-body" class="tpl-modal-body"></div>
        <div class="tpl-modal-actions">
          <button class="primary-action" id="tpl-modal-use">Use Template</button>
        </div>
      </div>
    </div>
  `;
}
