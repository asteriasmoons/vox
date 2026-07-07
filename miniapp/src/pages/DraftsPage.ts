import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

export function DraftsPage(): string {
  return `
    ${Header('Drafts', 'Saved announcements waiting for their moment.')}
    <main class="page-stack">
      ${GlassCard(`<div id="drafts-list" class="list-stack"><p class="muted">Loading drafts...</p></div>`)}
    </main>
  `;
}
