// LAMBERT AI - backend entry point
// Loads environment, then bootstraps the Fastify server.

import { config as loadEnv } from 'dotenv';
loadEnv();

const { startServer } = await import('./app.js');
await startServer();