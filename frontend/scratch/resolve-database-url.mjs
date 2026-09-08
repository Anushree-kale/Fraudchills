/** Shared by scratch/*.mjs — mirrors frontend/src/lib/database-url.ts */

function supabaseProjectRef() {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;
  const base = process.env.SUPABASE_URL?.trim()?.replace(/\/+$/, "");
  if (!base) return undefined;
  const m = base.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1];
}

export function resolveDatabaseUrl() {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const password =
    process.env.SUPABASE_DB_PASSWORD?.trim() || process.env.POSTGRES_PASSWORD?.trim();
  const ref = supabaseProjectRef();
  if (!password || !ref) {
    throw new Error(
      "Set DATABASE_URL or SUPABASE_URL + SUPABASE_DB_PASSWORD in frontend/.env.local"
    );
  }

  const poolerHost = process.env.SUPABASE_DB_HOST?.trim();
  if (poolerHost) {
    const port = process.env.SUPABASE_DB_PORT?.trim() || "6543";
    const user = poolerHost.includes("pooler") ? `postgres.${ref}` : "postgres";
    return `postgresql://${user}:${encodeURIComponent(password)}@${poolerHost}:${port}/postgres`;
  }

  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

export function stripSslQueryParams(connectionString) {
  const q = connectionString.indexOf('?');
  if (q === -1) return connectionString;
  const base = connectionString.slice(0, q);
  const params = new URLSearchParams(connectionString.slice(q + 1));
  params.delete('sslmode');
  params.delete('ssl');
  params.delete('uselibpqcompat');
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

export function isRemotePostgres(connectionString) {
  const host = connectionString.match(/:\/\/(?:[^@/]+@)?([^/:?]+)/)?.[1] ?? '';
  return (
    host.includes('supabase.co') ||
    host.includes('pooler.supabase.com') ||
    /[?&]sslmode=/i.test(connectionString)
  );
}

export function remoteSslConfig(connectionString) {
  return isRemotePostgres(connectionString) ? { rejectUnauthorized: false } : undefined;
}
