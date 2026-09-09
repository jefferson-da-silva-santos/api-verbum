// Script de importação: percorre data/perguntas_respostas_com_referencias.json
// e popula (ou atualiza) a tabela de perguntas + referências no Postgres (Neon).
//
// Uso: npm run seed
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mapReferencias(referencias = []) {
  return referencias.map((r) => ({
    display: r.display,
    bookSlug: r.bookSlug,
    chapter: r.chapter,
    verse: r.verse ?? null,
  }));
}

async function main() {
  const filePath = path.join(__dirname, '..', 'data', 'perguntas_completo.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const items = JSON.parse(raw);

  console.log(`Importando ${items.length} perguntas para o banco...`);

  let ok = 0;
  for (const item of items) {
    await prisma.pergunta.upsert({
      where: { id: item.id },
      update: {
        pergunta: item.pergunta,
        resposta: item.resposta,
        categoria: item.categoria ?? null,
        palavrasChave: item.palavrasChave ?? [],
        status: 'PUBLICADA', // perguntas importadas já nascem revisadas/publicadas
        referencias: {
          deleteMany: {}, // substitui as referências antigas pelas atuais do arquivo
          create: mapReferencias(item.referencias),
        },
      },
      create: {
        id: item.id,
        pergunta: item.pergunta,
        resposta: item.resposta,
        categoria: item.categoria ?? null,
        palavrasChave: item.palavrasChave ?? [],
        status: 'PUBLICADA',
        referencias: { create: mapReferencias(item.referencias) },
      },
    });
    ok += 1;
    if (ok % 50 === 0) console.log(`  ${ok}/${items.length}...`);
  }

  // O campo id agora é autoincrement (para as novas perguntas enviadas pelo app),
  // mas os 309 registros acima foram inseridos com id explícito (0-308), então a
  // sequence do Postgres não sabe disso ainda. Realinha para MAX(id)+1, senão a
  // próxima pergunta criada pelo app colidiria com um id já existente.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('perguntas', 'id'), COALESCE((SELECT MAX(id) FROM perguntas), 0) + 1, false);`,
  );

  console.log(`Importação concluída! ${ok} perguntas processadas. Sequence de id realinhada.`);
}

main()
  .catch((e) => {
    console.error('Falha na importação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
