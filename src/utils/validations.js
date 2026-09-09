import Joi from 'joi';

// Uma referência bíblica clicável, no padrão do GUIA_REFERENCIAS_BIBLICAS.md
export const referenciaSchema = Joi.object({
  display: Joi.string().trim().min(1).max(150).required()
    .messages({ 'any.required': 'A referência precisa de um texto de exibição (display).' }),
  bookSlug: Joi.string().trim().lowercase().max(10).required()
    .messages({ 'any.required': 'A referência precisa do bookSlug (ex: "mt", "1co").' }),
  chapter: Joi.number().integer().min(1).required(),
  verse: Joi.number().integer().min(1).optional(),
});

export const schemaCreatePergunta = Joi.object({
  // id é opcional: se não vier, o Postgres gera automaticamente (autoincrement).
  id: Joi.number().integer().min(0).optional(),
  pergunta: Joi.string().trim().min(3).required(),
  resposta: Joi.string().trim().min(1).required(),
  categoria: Joi.string().trim().max(60).allow('', null).optional(),
  palavrasChave: Joi.array().items(Joi.string().trim().max(40)).default([]),
  referencias: Joi.array().items(referenciaSchema).default([]),
  // Cadastro "completo" (admin/importação) já nasce publicado por padrão.
  status: Joi.string().valid('PENDENTE', 'PUBLICADA', 'REJEITADA').default('PUBLICADA'),
});

// Envio público (dentro do app): o usuário manda só a pergunta. Não tem resposta
// nem referências ainda — isso é preenchido depois, fora desta API, na revisão.
export const schemaCreateSugestaoPergunta = Joi.object({
  pergunta: Joi.string().trim().min(3).max(500).required(),
  autorPergunta: Joi.string().trim().max(120).allow('', null).optional(),
});

export const schemaUpdatePergunta = Joi.object({
  pergunta: Joi.string().trim().min(3),
  resposta: Joi.string().trim().min(1).allow(null),
  categoria: Joi.string().trim().max(60).allow('', null),
  palavrasChave: Joi.array().items(Joi.string().trim().max(40)),
  // Se "referencias" vier no corpo, TODAS as referências antigas são substituídas pelas novas.
  referencias: Joi.array().items(referenciaSchema),
  // Usado pela revisão (fora desta API) para aprovar/rejeitar uma pergunta pendente.
  status: Joi.string().valid('PENDENTE', 'PUBLICADA', 'REJEITADA'),
}).min(1).messages({ 'object.min': 'Envie ao menos um campo para atualizar (pergunta, resposta, categoria, palavrasChave, referencias ou status).' });

export const schemaIdParam = Joi.object({
  id: Joi.number().integer().min(0).required(),
});

export const schemaListQuery = Joi.object({
  q: Joi.string().trim().allow('').optional(),
  bookSlug: Joi.string().trim().lowercase().optional(),
  categoria: Joi.string().trim().optional(),
  keyword: Joi.string().trim().optional(),
  // identificador (opcional): quando enviado, perguntas já marcadas como
  // "lidas" por esse identificador vão para o final da listagem.
  identificador: Joi.string().trim().max(120).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const schemaPaginationQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const schemaPerguntaIdParam = Joi.object({
  perguntaId: Joi.number().integer().min(0).required(),
});

// ── Comentários ──────────────────────────────────────────────────

export const schemaCreateComentario = Joi.object({
  texto: Joi.string().trim().min(1).max(2000).required(),
  autor: Joi.string().trim().max(120).allow('', null).optional(),
});

export const schemaUpdateComentario = Joi.object({
  texto: Joi.string().trim().min(1).max(2000).required(),
});

// ── Reações ──────────────────────────────────────────────────────

export const schemaCreateReacao = Joi.object({
  tipo: Joi.string().valid('ESCLARECIDA', 'DUVIDA').required()
    .messages({ 'any.only': 'tipo deve ser "ESCLARECIDA" ou "DUVIDA".' }),
  identificador: Joi.string().trim().min(1).max(120).required()
    .messages({ 'any.required': 'Envie um "identificador" (id do dispositivo/sessão) para poder trocar o voto depois.' }),
});

export const schemaIdentificadorParam = Joi.object({
  perguntaId: Joi.number().integer().min(0).required(),
  identificador: Joi.string().trim().min(1).max(120).required(),
});

// Query opcional em GET /perguntas/:id — quando enviado, a resposta inclui
// se aquele identificador já favoritou/leu essa pergunta.
export const schemaGetPerguntaQuery = Joi.object({
  identificador: Joi.string().trim().max(120).optional(),
});

// Corpo simples usado por favoritos e leitura (marcar/desmarcar).
export const schemaIdentificadorBody = Joi.object({
  identificador: Joi.string().trim().min(1).max(120).required()
    .messages({ 'any.required': 'Envie um "identificador" (id do dispositivo/sessão).' }),
});
