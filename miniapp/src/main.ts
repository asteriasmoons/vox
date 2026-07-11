import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/editor.css';
import { render } from './router';
import { initTelegramMiniApp } from './utils/telegram';

initTelegramMiniApp();
void render('dashboard');

