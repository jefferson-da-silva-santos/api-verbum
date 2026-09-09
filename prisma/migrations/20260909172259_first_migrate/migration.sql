-- CreateTable
CREATE TABLE "perguntas" (
    "id" INTEGER NOT NULL,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perguntas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referencias" (
    "id" SERIAL NOT NULL,
    "display" TEXT NOT NULL,
    "book_slug" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER,
    "pergunta_id" INTEGER NOT NULL,

    CONSTRAINT "referencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referencias_pergunta_id_idx" ON "referencias"("pergunta_id");

-- CreateIndex
CREATE INDEX "referencias_book_slug_idx" ON "referencias"("book_slug");

-- AddForeignKey
ALTER TABLE "referencias" ADD CONSTRAINT "referencias_pergunta_id_fkey" FOREIGN KEY ("pergunta_id") REFERENCES "perguntas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
