import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** OAuth + Postgres adapter can exceed default hobby limits when DB is cold or cross-region. */
export const maxDuration = 60;

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
