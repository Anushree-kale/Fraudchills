import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";

const BACKEND =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

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

async function resolveUserEmail(req: NextRequest): Promise<string | undefined> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) return session.user.email;
  } catch (err) {
    console.error("[BFF Auth Error] Failed to get session:", err);
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return undefined;

  try {
    // getToken expects Node req shape; headers are enough for JWT cookie decode
    const token = await getToken({
      req: { headers: Object.fromEntries(req.headers) } as never,
      secret,
    });
    if (token?.email && typeof token.email === "string") return token.email;
  } catch (err) {
    console.error("[BFF Auth Error] JWT decode failed:", err);
  }
  return undefined;
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const subpath = pathSegments.join("/");
  if (!subpath) {
    return NextResponse.json({ detail: "Missing backend path." }, { status: 400 });
  }

  try {
    const email = await resolveUserEmail(req);
    const incoming = new URL(req.url);
    const target = `${BACKEND}/${subpath}${incoming.search}`;

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
      // @ts-ignore - 'duplex' is required when forwarding a stream in fetch
      duplex: "half",
    };

    // Forward the request body as a stream for non-GET/HEAD methods
    // This fixes the 'detached ArrayBuffer' issue caused by calling req.arrayBuffer()
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      init.body = req.body;
    }

    const res = await fetch(target, init);

    // Stream the response body back to the client
    const out = new NextResponse(res.body, { status: res.status });
    
    // Forward relevant headers (like content-type)
    const ct = res.headers.get("content-type");
    if (ct) out.headers.set("content-type", ct);
    
    return out;
  } catch (err: any) {
    console.error(`[BFF Proxy Error] ${req.method} ${subpath}:`, err);
    return NextResponse.json(
      { 
        detail: "Internal Proxy Error", 
        message: err.message,
        path: subpath 
      }, 
      { status: 500 }
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
