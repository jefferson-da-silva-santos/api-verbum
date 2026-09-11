// Gera o hash bcrypt de uma senha, pra colar em ADMIN_PASSWORD_HASH no .env.
//
// Uso: npm run admin:hash "minha-senha-aqui"
import bcrypt from 'bcrypt';

const senha = process.argv[2];

if (!senha) {
  console.error('Uso: npm run admin:hash "sua-senha-aqui"');
  process.exit(1);
}

const hash = await bcrypt.hash(senha, 10);

console.log('\nColoque isso no seu .env (ADMIN_PASSWORD_HASH):\n');
console.log(hash);
console.log('');
