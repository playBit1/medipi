import { PrismaClient } from '@/generated/prisma';

/* This file implements the Prisma client singleton pattern to prevent multiple database connections during development. 
It properly configures the Prisma client with appropriate logging levels based on the environment.
This is a critical infrastructure file that ensures efficient database access throughout the application. */

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
