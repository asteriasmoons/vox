import { Header } from '../components/Header';
import { GlassCard } from '../components/GlassCard';

export function SettingsPage(): string {
  return `
    ${Header('Settings', 'Configure your Vox Mini App environment.')}
    <main class="page-stack">
      ${GlassCard(`
        <h2>Backend URL</h2>
        <p class="muted">Production sends API requests to the Vox backend domain.</p>
        <code class="code-pill">https://api.vox.com.im</code>
      `)}
      ${GlassCard(`
        <h2>Telegram Mini App</h2>
        <p class="muted">Host the built miniapp over HTTPS and connect it through BotFather.</p>
      `)}
    </main>
  `;
}
