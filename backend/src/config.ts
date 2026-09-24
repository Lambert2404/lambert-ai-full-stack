import 'dotenv/config';

function intOr(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

function boolOr(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
  isTest: (process.env.NODE_ENV ?? 'development') === 'test',
  port: intOr('PORT', 4000),
  host: process.env.HOST ?? '0.0.0.0',
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:4000',
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'insecure-dev-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET ?? 'insecure-dev-refresh-secret',
  },
  passwordResetTtl: process.env.PASSWORD_RESET_TTL ?? '1h',
  bcryptRounds: intOr('BCRYPT_ROUNDS', 10),
  storageDir: process.env.STORAGE_DIR ?? './storage/uploads',
  maxUploadMb: intOr('MAX_UPLOAD_MB', 25),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  ai: {
    fallbackEnabled: boolOr('AI_FALLBACK_ENABLED', true),
    openai: {
      key: process.env.OPENAI_API_KEY ?? '',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    },
    microsoft: {
      endpoint: process.env.MICROSOFT_AI_ENDPOINT ?? '',
      key: process.env.MICROSOFT_AI_API_KEY ?? '',
      model: process.env.MICROSOFT_AI_MODEL ?? 'gpt-4o-mini',
    },
    gemini: {
      key: process.env.GEMINI_API_KEY ?? '',
      model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    },
    anthropic: {
      key: process.env.ANTHROPIC_API_KEY ?? '',
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
    },
    openrouter: {
      key: process.env.OPENROUTER_API_KEY ?? '',
      model: process.env.OPENROUTER_MODEL ?? 'openrouter/auto',
      baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    },
  },
  voice: {
    transcribeUrl: process.env.VOICE_TRANSCRIBE_URL ?? '',
    transcribeKey: process.env.VOICE_TRANSCRIBE_KEY ?? '',
    synthesizeUrl: process.env.VOICE_SYNTHESIZE_URL ?? '',
    synthesizeKey: process.env.VOICE_SYNTHESIZE_KEY ?? '',
  },
} as const;

export type AppConfig = typeof config;

export function providerHasKey(code: 'openai' | 'microsoft' | 'google_gemini' | 'anthropic_claude' | 'openrouter'): boolean {
  switch (code) {
    case 'openai':
      return config.ai.openai.key.length > 0;
    case 'microsoft':
      return config.ai.microsoft.endpoint.length > 0 && config.ai.microsoft.key.length > 0;
    case 'google_gemini':
      return config.ai.gemini.key.length > 0;
    case 'anthropic_claude':
      return config.ai.anthropic.key.length > 0;
    case 'openrouter':
      return config.ai.openrouter.key.length > 0;
  }
}