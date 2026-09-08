/** Resolve PostgreSQL connection URL — Supabase-first, optional explicit DATABASE_URL. */

function supabaseProjectRef(): string | undefined {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;
  const base = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return undefined;
  const m = base.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1];
}

function encodePassword(password: string): string {
  return encodeURIComponent(password);
}

export function resolveDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const password =
    process.env.SUPABASE_DB_PASSWORD?.trim() || process.env.POSTGRES_PASSWORD?.trim();
  const ref = supabaseProjectRef();
  if (!password || !ref) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase Postgres URI to frontend/.env.local " +
        "(Supabase → Project Settings → Database → Connection string → URI), " +
        "or set SUPABASE_URL and SUPABASE_DB_PASSWORD."
    );
  }

  const poolerHost = process.env.SUPABASE_DB_HOST?.trim();
  if (poolerHost) {
    const port = process.env.SUPABASE_DB_PORT?.trim() || "6543";
    const user = poolerHost.includes("pooler") ? `postgres.${ref}` : "postgres";
    return `postgresql://${user}:${encodePassword(password)}@${poolerHost}:${port}/postgres`;
  }

  return `postgresql://postgres:${encodePassword(password)}@db.${ref}.supabase.co:5432/postgres`;
}

/** Remove sslmode from URI — node `pg` treats require as verify-full and breaks Supabase chains. */
export function stripSslQueryParams(connectionString: string): string {
  const q = connectionString.indexOf("?");
  if (q === -1) return connectionString;
  const base = connectionString.slice(0, q);
  const params = new URLSearchParams(connectionString.slice(q + 1));
  params.delete("sslmode");
  params.delete("ssl");
  params.delete("uselibpqcompat");
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

export function isRemotePostgres(connectionString: string): boolean {
  const host = postgresUrlHost(connectionString);
  return (
    host.includes("supabase.co") ||
    host.includes("pooler.supabase.com") ||
    host.includes("neon.tech") ||
    /[?&]sslmode=/i.test(connectionString)
  );
}

export function postgresUrlHost(connectionString: string): string {
  const m = connectionString.match(/:\/\/(?:[^@/]+@)?([^/:?]+)/);
  return m?.[1] ?? "";
}
