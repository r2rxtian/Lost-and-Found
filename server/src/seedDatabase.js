import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getPool, sql } from './config/database.js';

const required = ['ADMIN_FIRST_NAME', 'ADMIN_LAST_NAME', 'ADMIN_EMAIL'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required for the one-time admin bootstrap`);

async function readPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (!process.stdin.isTTY) throw new Error('ADMIN_PASSWORD is required when the bootstrap is not run interactively');
  process.stdout.write('Initial admin password: ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = '';
  return new Promise((resolve, reject) => {
    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') { process.stdin.setRawMode(false); reject(new Error('Bootstrap cancelled')); return; }
        if (character === '\r' || character === '\n') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', onData); process.stdout.write('\n'); resolve(value); return; }
        if (character === '\u007f' || character === '\b') { value = value.slice(0, -1); continue; }
        value += character;
      }
    };
    process.stdin.on('data', onData);
  });
}

const adminPassword = await readPassword();
if (adminPassword.length < 8) throw new Error('The initial administrator password must be at least 8 characters');
const pool = await getPool();
const existing = await pool.request().query('SELECT COUNT(*) count FROM lf_users');
if (existing.recordset[0].count) {
  console.error('Seed stopped: lf_users is not empty. No existing SQL data was changed.');
  process.exitCode = 1;
} else {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  const request = (values = {}) => { const query = new sql.Request(transaction); Object.entries(values).forEach(([key, value]) => query.input(key, value ?? null)); return query; };
  try {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = { firstName: process.env.ADMIN_FIRST_NAME, lastName: process.env.ADMIN_LAST_NAME, email: process.env.ADMIN_EMAIL.toLowerCase(), passwordHash };
    await request(admin).query(`INSERT lf_users(first_name,last_name,email,password_hash,role_id,status) VALUES(@firstName,@lastName,@email,@passwordHash,(SELECT role_id FROM lf_roles WHERE role_name='ADMIN'),'Active')`);
    await transaction.commit();
    console.log(`Initial administrator created: ${admin.email}`);
  } catch (error) { await transaction.rollback(); throw error; }
  finally { await pool.close(); }
}
