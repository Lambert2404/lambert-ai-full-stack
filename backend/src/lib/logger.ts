import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.isTest ? 'silent' : config.logLevel,
  base: {
    service: 'lambert-ai-backend',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.apiKey',
      '*.key',
    ],
    censor: '[REDACTED]',
  },
});