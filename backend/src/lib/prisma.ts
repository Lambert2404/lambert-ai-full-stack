import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { lambertPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.lambertPrisma ??
  new PrismaClient({
    log: process.env.LOG_QUERIES === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.lambertPrisma = prisma;
}