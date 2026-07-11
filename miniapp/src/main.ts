import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/editor.css';
import { render } from './router';
import { initTelegramMiniApp } from './utils/telegram';

// Initialize the Telegram environment
initTelegramMiniApp();

// Render the initial dashboard page
void render('dashboard');

// Global navigation listener for buttons with a data-page attribute
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const page = target.getAttribute('data-page');

  if (page) {
    void render(page);
  }
});
