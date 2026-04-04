import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const BACKEND =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ??
  "http://127.0.0.1:8000";

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
  //    getServerSession (or any code that reads the request) can consume
  //    the body stream and detach the underlying ArrayBuffer.
  let bodyBuffer: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      const ab = await req.arrayBuffer();
      if (ab.byteLength > 0) {
        // Copy into a Node Buffer immediately.  Buffer owns its own memory,
        // so even if the original ArrayBuffer is later detached the data is safe.
        bodyBuffer = Buffer.from(ab);
      }
    } catch (err) {
      console.error("[BFF Proxy] Failed to read request body:", err);
    }
  }

  // 2) Session AFTER body — with PostgresAdapter the sessions are DB-backed
  //    opaque tokens; getToken() is always null, so we use getServerSession().
  let email: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      email = session.user.email;
    }
  } catch (err) {
    console.error("[BFF Auth Error] getServerSession failed:", err);
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
      // ── FIX: redirect: "error" ────────────────────────────────────────
      // Node's fetch follows 307 redirects automatically and tries to
      // re-slice the body ArrayBuffer for the second request.  If FastAPI
      // (or its app-level redirect_slashes default) issues a 307 redirect,
      // the buffer will already be consumed/detached on the retry, causing:
      //   TypeError: Cannot perform ArrayBuffer.prototype.slice
      //              on a detached ArrayBuffer
      // Setting redirect to "error" makes the fetch throw immediately on
      // any redirect, surfacing the real URL that triggered the 307.
      redirect: "error",
      // ── FIX: pass Buffer directly instead of Uint8Array ───────────────
      // Buffer is a Uint8Array subclass that Node handles natively without
      // needing an extra .slice() on the underlying ArrayBuffer.
      ...(bodyBuffer !== undefined && bodyBuffer.length > 0
        ? { body: bodyBuffer as unknown as BodyInit }
        : {}),
    };

    const res = await fetch(target, init);

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