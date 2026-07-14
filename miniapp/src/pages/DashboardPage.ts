import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

export function DashboardPage(): string {
  return `
    ${Header('Dashboard', 'Plan, draft, and publish your Telegram announcements.')}
    <main class="page-stack">
      ${GlassCard(`
        <div class="metric-grid">
          <div><span>Drafts</span><strong id="draft-count">—</strong></div>
          <div><span>Channels</span><strong id="channel-count">—</strong></div>
          <div><span>Posted</span><strong id="posted-count">—</strong></div>
          <div><span>Scheduled</span><strong id="scheduled-count">—</strong></div>
        </div>
      `)}
      ${GlassCard(`
        <h2>Post Studio</h2>
        <p class="muted">Jump into the visual editor to compose a polished update with formatting, preview, and inline buttons.</p>
        <button class="primary-action" data-page="editor">Create Announcement</button>
      `)}
      ${GlassCard(`
        <h2>Quick Links</h2>
        <div class="quick-links">
          <button class="primary-action" data-page="calendar">View Calendar</button>
          <button class="primary-action" data-page="templates">Browse Templates</button>
        </div>
      `)}
    </main>
  `;
}
