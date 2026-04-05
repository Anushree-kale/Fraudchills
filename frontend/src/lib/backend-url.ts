/** Base URL for direct server → FastAPI calls (BFF, server actions, RSC). */
const DEFAULT_BACKEND = "https://fraudchills.onrender.com";

function normalizeBackendUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(trimmed);
    // Render (and most hosts) redirect HTTP→HTTPS. fetch(..., { redirect: "error" }) throws on that.
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol === "http:" && !local) {
      u.protocol = "https:";
      return `${u.origin}${u.pathname}`.replace(/\/+$/, "") || u.origin;
    }
  } catch {
    /* keep trimmed */
  }
  return trimmed;
}

export function getDirectBackendBaseUrl(): string {
  const raw =
    process.env.BACKEND_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_BACKEND;
  return normalizeBackendUrl(raw);
}
