import 'server-only';
import { Pool, type PoolConfig } from 'pg';

/** Host segment after optional user:pass@ (avoids URL parsing passwords with special chars). */
function postgresUrlHost(connectionString: string): string {
  const m = connectionString.match(/:\/\/(?:[^@/]+@)?([^/:?]+)/);
  return m?.[1] ?? '';
}

function assertNotRenderInternalHostname(connectionString: string): void {
  if (!connectionString.startsWith('postgres')) return;
  const host = postgresUrlHost(connectionString);
  if (host.startsWith('dpg-') && !host.includes('.')) {
    throw new Error(
      'DATABASE_URL uses Render internal Postgres hostname (no dots in host). ' +
        'Use the External Database URL from Render (host like *.render.com) in .env.local and on Vercel.'
    );
  }
}

function buildPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  assertNotRenderInternalHostname(connectionString);

  const host = postgresUrlHost(connectionString);
  const urlSaysRequire = /[?&]sslmode=require/i.test(connectionString);
  const looksRemote =
    urlSaysRequire ||
    host.includes('render.com') ||
    host.includes('neon.tech') ||
    host.endsWith('supabase.co');

  const config: PoolConfig = { connectionString };

  // Vercel serverless: one connection per invocation avoids exhausting Postgres and long cold pools.
  if (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    config.max = 1;
    config.connectionTimeoutMillis = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 15_000);
    config.idleTimeoutMillis = 10_000;
  }

  // Default to SSL for Render/Neon/Supabase unless DATABASE_SSL is explicitly 'false'.
  const sslEnabled = process.env.DATABASE_SSL !== 'false' && looksRemote;

  if (sslEnabled) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

let poolInstance: Pool | undefined;

function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool(buildPoolConfig());
  }
  return poolInstance;
}

/** Lazy pool so `next build` can load routes without connecting; first DB use validates URL. */
const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const p = getPool();
    const value = Reflect.get(p, prop, receiver);
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(p);
    }
    return value;
  },
}) as Pool;

export const query = (text: string, params?: any[]) => getPool().query(text, params);

export default pool;
