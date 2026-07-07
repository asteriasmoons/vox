import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

export function ChannelsPage(): string {
  return `
    ${Header('Channels', 'Manage the Telegram destinations Vox can publish to.')}
    <main class="page-stack">
      ${GlassCard(`<div id="channels-list" class="list-stack"><p class="muted">Loading channels...</p></div>`)}
    </main>
  `;
}
