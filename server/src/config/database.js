import sql from 'mssql/msnodesqlv8.js';

let pool;

export async function getPool() {
  if (pool?.connected) return pool;
  for (const key of ['DB_SERVER', 'DB_DATABASE']) {
    if (!process.env[key]) throw new Error(`${key} is required. Copy server/.env.example to server/.env and configure SQL Server.`);
  }
  const server = process.env.DB_INSTANCE ? `${process.env.DB_SERVER}\\${process.env.DB_INSTANCE}` : process.env.DB_SERVER;
  const driver = process.env.DB_DRIVER || 'ODBC Driver 17 for SQL Server';
  const config = {
    connectionString: `Driver={${driver}};Server=${server};Database=${process.env.DB_DATABASE};Trusted_Connection=yes;Encrypt=${process.env.DB_ENCRYPT === 'true' ? 'yes' : 'no'};TrustServerCertificate=${process.env.DB_TRUST_CERTIFICATE !== 'false' ? 'yes' : 'no'};`,
    options: { useUTC: true },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  };
  pool = await sql.connect(config);
  return pool;
}

export { sql };
