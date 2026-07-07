import cors from 'cors';
import express from 'express';
import { channelsRouter } from './routes/channels.js';
import { draftsRouter } from './routes/drafts.js';
import { postsRouter } from './routes/posts.js';
import { env } from './utils/env.js';

export const app = express();

app.use(cors({ origin: env.miniappOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'vox-backend' });
});

app.use('/api/posts', postsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/drafts', draftsRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown server error';
  response.status(500).json({ ok: false, error: message });
});
