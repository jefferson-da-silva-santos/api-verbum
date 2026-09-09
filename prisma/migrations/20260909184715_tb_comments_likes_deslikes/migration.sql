-- CreateEnum
CREATE TYPE "ReacaoTipo" AS ENUM ('ESCLARECIDA', 'DUVIDA');

-- CreateTable
CREATE TABLE "comentarios" (
    "id" SERIAL NOT NULL,
    "texto" TEXT NOT NULL,
    "autor" TEXT,
    "pergunta_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reacoes" (
    "id" SERIAL NOT NULL,
    "tipo" "ReacaoTipo" NOT NULL,
    "pergunta_id" INTEGER NOT NULL,
    "identificador" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comentarios_pergunta_id_idx" ON "comentarios"("pergunta_id");

-- CreateIndex
CREATE INDEX "reacoes_pergunta_id_idx" ON "reacoes"("pergunta_id");

-- CreateIndex
CREATE INDEX "reacoes_tipo_idx" ON "reacoes"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "reacoes_pergunta_id_identificador_key" ON "reacoes"("pergunta_id", "identificador");

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "perguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reacoes" ADD CONSTRAINT "reacoes_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "perguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
