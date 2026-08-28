import sql from 'mssql';

let pool;

export const isSqlMode = () => (process.env.DB_MODE || 'demo').toLowerCase() === 'sql';

export async function getPool() {
  if (!isSqlMode()) return null;
  if (pool?.connected) return pool;
  const config = {
    server: process.env.DB_SERVER || '127.0.0.1',
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_DATABASE || 'LostFoundDB',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== 'false',
      instanceName: process.env.DB_INSTANCE || undefined
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  };
  pool = await sql.connect(config);
  return pool;
}

export { sql };
