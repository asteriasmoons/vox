import { app } from './app.js';
import { env } from './utils/env.js';

app.listen(env.port, () => {
  console.log(`Vox backend running on http://localhost:${env.port}`);
});
