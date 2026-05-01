// Entry point: `npm run worker:hermes`
//
// In dev (`worker:hermes`) we expect `--env-file=.env.local` from the
// npm script. In prod (`worker:hermes:prod`) Coolify / docker-compose
// inject env vars directly. No dotenv dep needed either way.

import('../workers/hermes-worker').then(m => m.start()).catch((err: any) => {
  // eslint-disable-next-line no-console
  console.error('[start-hermes-worker] boot failed:', err);
  process.exit(1);
});
