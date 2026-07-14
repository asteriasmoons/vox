import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyticsRouter } from './routes/analytics.js';
import { channelsRouter } from './routes/channels.js';
import { draftsRouter } from './routes/drafts.js';
import { postsRouter } from './routes/posts.js';
import { scheduleRouter } from './routes/schedule.js';
import { telegramWebhookRouter } from './routes/telegramWebhook.js';
import { templatesRouter } from './routes/templates.js';
import { env } from './utils/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const miniappDistPath = path.resolve(__dirname, '../../miniapp/dist');

export const app = express();

app.use(cors({ origin: env.miniappOrigin === '*' ? true : env.miniappOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'vox-backend' });
});

app.use('/api/posts', postsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/drafts', draftsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/telegram', telegramWebhookRouter);

app.use(express.static(miniappDistPath));

app.get('*', (_request, response) => {
  response.sendFile(path.join(miniappDistPath, 'index.html'));
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown server error';
  response.status(500).json({ ok: false, error: message });
});
