import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const BACKEND =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ??
  "https://fraudchills.onrender.com";

console.log("[BFF] BACKEND =", BACKEND);

const HOP_BY_HOP = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export const dynamic = "force-dynamic";

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
    const incoming = new URL(req.url);
    const target = `${BACKEND}/${subpath}${incoming.search}`;

    console.log("[BFF] →", req.method, target);

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      headers.set(key, value);
    });

    if (email) {
      headers.set("X-User-Email", email);
    }

    const init: RequestInit = {
      method: req.method,
      headers,
      cache: "no-store",
      redirect: "error",
      ...(bodyBuffer !== undefined && bodyBuffer.length > 0
        ? { body: bodyBuffer as unknown as BodyInit }
        : {}),
    };

    const res = await fetch(target, init);
    console.log("[BFF] ←", res.status, target);
    if (!res.ok) {
      const body = await res.text();
      console.log("[BFF] Error body:", body);
      return NextResponse.json({ detail: body }, { status: res.status });
    }
    const out = new NextResponse(res.body, { status: res.status });
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
        detail: "Internal Proxy Error",
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