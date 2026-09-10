-- CreateEnum
CREATE TYPE "PerguntaStatus" AS ENUM ('PENDENTE', 'PUBLICADA', 'REJEITADA');

-- AlterTable
CREATE SEQUENCE perguntas_id_seq;
ALTER TABLE "perguntas" ADD COLUMN     "autor_pergunta" TEXT,
ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "palavras_chave" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "PerguntaStatus" NOT NULL DEFAULT 'PENDENTE',
ALTER COLUMN "id" SET DEFAULT nextval('perguntas_id_seq'),
ALTER COLUMN "resposta" DROP NOT NULL;
ALTER SEQUENCE perguntas_id_seq OWNED BY "perguntas"."id";

-- CreateTable
CREATE TABLE "favoritos" (
    "id" SERIAL NOT NULL,
    "pergunta_id" INTEGER NOT NULL,
    "identificador" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leituras" (
    "id" SERIAL NOT NULL,
    "pergunta_id" INTEGER NOT NULL,
    "identificador" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leituras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favoritos_identificador_idx" ON "favoritos"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "favoritos_pergunta_id_identificador_key" ON "favoritos"("pergunta_id", "identificador");

-- CreateIndex
CREATE INDEX "leituras_identificador_idx" ON "leituras"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "leituras_pergunta_id_identificador_key" ON "leituras"("pergunta_id", "identificador");

-- CreateIndex
CREATE INDEX "perguntas_status_idx" ON "perguntas"("status");

-- CreateIndex
CREATE INDEX "perguntas_categoria_idx" ON "perguntas"("categoria");

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "perguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leituras" ADD CONSTRAINT "leituras_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "perguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
