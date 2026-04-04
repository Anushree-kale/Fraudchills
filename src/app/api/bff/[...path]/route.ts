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
  const session = await getServerSession(authOptions);
  if (session?.user?.email) return session.user.email;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return undefined;

  try {
    // getToken expects Node req shape; headers are enough for JWT cookie decode
    const token = await getToken({
      req: { headers: Object.fromEntries(req.headers) } as never,
      secret,
    });
    if (token?.email && typeof token.email === "string") return token.email;
  } catch {
    /* ignore */
  }
  return undefined;
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const subpath = pathSegments.join("/");
  if (!subpath) {
    return NextResponse.json({ detail: "Missing backend path." }, { status: 400 });
  }

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
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(target, init);
  const body = await res.arrayBuffer();
  const out = new NextResponse(body, { status: res.status });
  const ct = res.headers.get("content-type");
  if (ct) out.headers.set("content-type", ct);
  return out;
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
