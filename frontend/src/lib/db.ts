import 'server-only';
import { Pool, type PoolConfig } from 'pg';

function buildPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const hostMatch = connectionString.match(/@([^/:]+)/);
  const host = hostMatch?.[1] ?? '';
  const urlSaysRequire = /[?&]sslmode=require/i.test(connectionString);
  const looksRemote =
    urlSaysRequire ||
    host.includes('render.com') ||
    host.includes('neon.tech') ||
    host.endsWith('supabase.co');

  const config: PoolConfig = { connectionString };
  
  // Default to SSL for Render/Neon/Supabase unless DATABASE_SSL is explicitly 'false'.
  const sslEnabled = process.env.DATABASE_SSL !== 'false' && looksRemote;
  
  if (sslEnabled) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

const pool = new Pool(buildPoolConfig());

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
