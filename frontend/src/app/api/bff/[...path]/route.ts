import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDirectBackendBaseUrl } from "@/lib/backend-url";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Build outbound headers — do not forward the browser request wholesale (invalid / hop-by-hop headers break Node fetch on Vercel). */
function buildUpstreamHeaders(req: NextRequest, email: string | undefined): Headers {
  const h = new Headers();
  const accept = req.headers.get("accept");
  if (accept) h.set("Accept", accept);
  else h.set("Accept", "application/json");
  const authz = req.headers.get("authorization");
  if (authz) h.set("Authorization", authz);
  if (email) h.set("X-User-Email", email);
  return h;
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const subpath = pathSegments.join("/");
  if (!subpath) {
    return NextResponse.json({ detail: "Missing backend path." }, { status: 400 });
  }

  // 1) Buffer body FIRST — before anything else touches the Request.
  let bodyBuffer: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      const ab = await req.arrayBuffer();
      if (ab.byteLength > 0) {
        bodyBuffer = Buffer.from(ab);
      }
    } catch (err) {
      console.error("[BFF Proxy] Failed to read request body:", err);
    }
  }

  // 2) Resolve email for X-User-Email → FastAPI (single getServerSession call).
  const forwardedRaw = req.headers.get("x-user-email");
  const forwardedEmail = forwardedRaw?.trim() || undefined;

  let sessionEmail: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    sessionEmail = session?.user?.email?.trim() || undefined;
  } catch (err) {
    console.error("[BFF Auth Error] getServerSession failed:", err);
  }

  // Prefer forwarded header when set (client api.ts sends it for every authed BFF call).
  // If it disagrees with the signed-in session, use session (spoof protection).
  let email: string | undefined;
  if (forwardedEmail && sessionEmail) {
    email =
      forwardedEmail.toLowerCase() === sessionEmail.toLowerCase()
        ? forwardedEmail
        : sessionEmail;
  } else {
    email = forwardedEmail ?? sessionEmail;
  }

  try {
    const backend = getDirectBackendBaseUrl();
    const incoming = new URL(req.url);
    const target = `${backend}/${subpath}${incoming.search}`;

    if (process.env.NODE_ENV === "development") {
      console.log("[BFF] →", req.method, target);
    }

    const headers = buildUpstreamHeaders(req, email);
    if (bodyBuffer !== undefined && bodyBuffer.length > 0) {
      const ct = req.headers.get("content-type");
      if (ct) headers.set("Content-Type", ct);
      else headers.set("Content-Type", "application/json");
    }

    const init: RequestInit = {
      method: req.method,
      headers,
      cache: "no-store",
      redirect: "follow",
      ...(bodyBuffer !== undefined && bodyBuffer.length > 0
        ? { body: bodyBuffer as unknown as BodyInit }
        : {}),
    };

    const res = await fetch(target, init);
    if (process.env.NODE_ENV === "development") {
      console.log("[BFF] ←", res.status, target);
    }
    if (!res.ok) {
      const body = await res.text();
      if (process.env.NODE_ENV === "development") {
        console.log("[BFF] Error body:", body);
      }
      return NextResponse.json({ detail: body }, { status: res.status });
    }

    // Buffer upstream body — passing res.body (ReadableStream) into NextResponse often throws on Vercel
    // even when Render returned 200, which surfaces as "Proxy error" with no useful Render logs.
    const payload = await res.arrayBuffer();
    const out = new NextResponse(payload, { status: res.status });
    const ct = res.headers.get("content-type");
    if (ct) out.headers.set("content-type", ct);

    return out;
  } catch (err: unknown) {
    const e = err as Error & { cause?: unknown };
    const cause =
      e.cause instanceof Error
        ? `${e.cause.name}: ${e.cause.message}`
        : e.cause != null
          ? String(e.cause)
          : undefined;
    console.error(
      `[BFF Proxy Error] ${req.method} ${subpath}:`,
      e.message,
      cause ? `cause: ${cause}` : "",
      err
    );
    return NextResponse.json(
      {
        detail: `Proxy error (${subpath}): ${e.message}${cause ? ` — ${cause}` : ""}`,
        message: e.message,
        ...(cause ? { cause } : {}),
        path: subpath,
      },
      { status: 502 }
    );
  }
}

type RouteCtx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? []);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;