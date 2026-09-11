// Configuração do admin do painel. Propositalmente NÃO há uma tabela de
// usuários no banco ainda (só existe um admin, ver comentário em
// middlewares/auth.js) — as credenciais vivem em variável de ambiente:
//
//   ADMIN_EMAIL          e-mail de login
//   ADMIN_PASSWORD_HASH  hash bcrypt da senha (gere com `npm run admin:hash`)
//
// Se um dia existir um módulo de usuários/admins de verdade, é só trocar
// LoginAdminService para consultar o banco em vez destas variáveis — o resto
// (JWT + middleware `auth`) continua igual.
//
// Lê o `process.env` na hora de chamar (não no import): módulos ESM são
// avaliados assim que importados, antes de qualquer variável de ambiente
// definida depois do import — ler direto no import "congelaria" um valor
// desatualizado (isso também facilita testar com env vars diferentes).
export function getAdminConfig() {
  return {
    email: process.env.ADMIN_EMAIL || null,
    passwordHash: process.env.ADMIN_PASSWORD_HASH || null,
  };
}

export function isAdminLoginConfigured() {
  const { email, passwordHash } = getAdminConfig();
  return Boolean(email && passwordHash);
}
