import 'server-only';
import { Pool, type PoolConfig } from 'pg';
import {
  isRemotePostgres,
  resolveDatabaseUrl,
  stripSslQueryParams,
} from '@/lib/database-url';

function buildPoolConfig(): PoolConfig {
  const resolved = resolveDatabaseUrl();
  const looksRemote = isRemotePostgres(resolved);
  const connectionString = stripSslQueryParams(resolved);

  const config: PoolConfig = { connectionString };

  if (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    config.max = 1;
    config.connectionTimeoutMillis = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 15_000);
    config.idleTimeoutMillis = 10_000;
  }

  if (process.env.DATABASE_SSL !== 'false' && looksRemote) {
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

export const query = (text: string, params?: unknown[]) => getPool().query(text, params);

export default pool;
