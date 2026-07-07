import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

export function SettingsPage(): string {
  return `
    ${Header('Settings', 'Configure your Vox Mini App environment.')}
    <main class="page-stack">
      ${GlassCard(`
        <h2>Backend URL</h2>
        <p class="muted">Set VITE_API_BASE_URL in miniapp/.env when you deploy.</p>
        <code class="code-pill">VITE_API_BASE_URL=http://localhost:3000</code>
      `)}
      ${GlassCard(`
        <h2>Telegram Mini App</h2>
        <p class="muted">Host the built miniapp over HTTPS and connect it through BotFather.</p>
      `)}
    </main>
  `;
}
