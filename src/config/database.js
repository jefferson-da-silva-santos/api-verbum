import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// A conexão com a Neon pode cair sozinha quando o compute hiberna por
// inatividade (erro típico: "Error { kind: Closed, cause: None }"). Isso é
// esperado com a connection string COM pooling (ver .env.example) — o
// pgbouncer reabre a conexão na próxima query sozinho. Aqui só garantimos que
// a conexão inicial (no boot do servidor) tenta de novo antes de desistir.
export async function connectDatabase({ retries = 5, delayMs = 2000 } = {}) {
  for (let tentativa = 1; tentativa <= retries; tentativa += 1) {
    try {
      await prisma.$connect();
      return prisma;
    } catch (err) {
      if (tentativa === retries) throw err;
      logger.warn(`Falha ao conectar no banco (tentativa ${tentativa}/${retries}): ${err.message}. Tentando de novo em ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
