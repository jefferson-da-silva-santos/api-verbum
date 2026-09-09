import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export async function connectDatabase() {
  await prisma.$connect();
  return prisma;
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
