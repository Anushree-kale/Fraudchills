import Link from "next/link";
import { LoginForm } from "./LoginForm";

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function siteOrigin(): string {
  const raw = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

/** Server-safe callback URL (mirrors client safeCallbackUrl using known site origin). */
function safeCallbackUrl(raw: string | undefined, origin: string): string {
  if (!raw || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/")) return raw;
  if (origin) {
    try {
      const u = new URL(raw);
      if (u.origin === origin) {
        const path = `${u.pathname}${u.search}`;
        return path || "/dashboard";
      }
    } catch {
      /* ignore */
    }
  }
  return "/dashboard";
}

type Search = Record<string, string | string[] | undefined>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const error = firstParam(sp.error);
  const afterSignIn = safeCallbackUrl(firstParam(sp.callbackUrl), siteOrigin());

  return (
    <main className="min-h-screen bg-[var(--cream)] flex flex-col pt-[64px]">
      <div className="flex-1 flex items-center justify-center px-10 py-20">
        <LoginForm error={error} afterSignIn={afterSignIn} />
      </div>

      <footer className="py-16 px-10 xl:px-24 bg-[var(--dark)] border-t border-white/5 dark-section">
        <div className="max-w-[var(--content-max)] mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="font-bebas text-2xl tracking-tighter flex items-center gap-3">
            <span className="text-[var(--gold)]">FRAUD</span>
            <span className="text-white">CHILLS_</span>
          </div>
          <div className="flex gap-12">
            {["Privacy", "Terms", "API", "Status"].map((link) => (
              <Link key={link} href="#" className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--muted)] hover:text-white transition-all">
                {link}
              </Link>
            ))}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--dim)]">
            © 2026 FRAUDCHILLS. DISTRIBUTED PROTOCOL.
          </div>
        </div>
      </footer>
    </main>
  );
}
