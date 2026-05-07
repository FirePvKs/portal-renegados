import readline from 'readline';
import { query, queryOne, pool } from '../src/lib/db.js';
import { hashPassword } from '../src/lib/auth.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
  console.log('\n🥷 Creación del primer Líder\n');

  const existingLider = await queryOne(
    `SELECT username FROM users WHERE role = 'lider' LIMIT 1`
  );

  if (existingLider) {
    console.log(`⚠️  Ya existe un líder: ${existingLider.username}`);
    console.log('   Si quieres crear otro, hazlo desde el panel admin de la app.\n');
    rl.close();
    await pool.end();
    return;
  }

  const username = (await ask('Username del líder (3-20 caracteres): ')).trim().toLowerCase();

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    console.error('❌ Username inválido. Solo letras, números y _ (3-20 caracteres)');
    rl.close();
    await pool.end();
    process.exit(1);
  }

  const password = await ask('Password (mínimo 6 caracteres): ');

  if (password.length < 6) {
    console.error('❌ Password muy corta');
    rl.close();
    await pool.end();
    process.exit(1);
  }

  const existing = await queryOne(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );
  if (existing) {
    console.error(`❌ El username "${username}" ya existe`);
    rl.close();
    await pool.end();
    process.exit(1);
  }

  console.log('\n⏳ Creando usuario...');

  const hash = await hashPassword(password);
  const user = await queryOne(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'lider')
     RETURNING id, username, role`,
    [username, hash]
  );

  console.log('\n✅ Líder creado correctamente:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Rol: ${user.role}`);
  console.log('\nYa puedes iniciar sesión en la app.\n');

  rl.close();
  await pool.end();
}

main().catch(async (err) => {
  console.error('❌ Error:', err.message);
  rl.close();
  await pool.end();
  process.exit(1);
});
