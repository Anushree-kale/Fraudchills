import 'server-only';
import { Pool, type PoolConfig } from 'pg';

function buildPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Render / most hosted Postgres: TLS required for connections from outside their private network.
  // Local Postgres typically has no SSL; don't force it on localhost.
  const hostMatch = connectionString.match(/@([^/:]+)/);
  const host = hostMatch?.[1] ?? '';
  const urlSaysRequire = /[?&]sslmode=require/i.test(connectionString);
  const looksRemote =
    urlSaysRequire ||
    host.includes('render.com') ||
    host.includes('neon.tech') ||
    host.endsWith('supabase.co');

  const config: PoolConfig = { connectionString };
  if (looksRemote && !host.includes('localhost') && host !== '127.0.0.1') {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

const pool = new Pool(buildPoolConfig());

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
