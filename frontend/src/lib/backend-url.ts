/** Base URL for direct server → FastAPI calls (BFF, server actions, RSC). */
const DEFAULT_BACKEND = "https://fraudchills.onrender.com";

function normalizeBackendUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(trimmed);
    // Render (and most hosts) redirect HTTP→HTTPS. fetch(..., { redirect: "error" }) throws on that.
    // If NEXT_PUBLIC_API_URL or BACKEND_URL starts with http://, it will be treated as-is 
    // unless we are in a non-local environment. 
    if (u.protocol === "http:" && process.env.NODE_ENV === "production") {
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
