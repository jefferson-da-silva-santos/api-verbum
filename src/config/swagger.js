export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Verbum API',
      version: '1.0.0',
      description:
        'API do app Verbum, construída com Node.js + Express + Prisma (Neon PostgreSQL), seguindo a arquitetura do framework Sotov. Módulo inicial: Perguntas & Respostas bíblicas.',
    },
  },
  apis: ['./src/routes/*.js'],
};
