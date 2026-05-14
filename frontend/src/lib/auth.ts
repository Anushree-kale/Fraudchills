import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { Pool } from "pg";
import pool from "@/lib/db";

/**
 * Custom adapter wrapper. 
 * Since init.sql has DEFAULT gen_random_uuid(), we don't need to manually 
 * supply IDs. The base PostgresAdapter handles the mapping.
 */
function fraudchillsPostgresAdapter(client: Pool): Adapter {
  return PostgresAdapter(client) as Adapter;
}

/**
 * Shared NextAuth configuration. Lives in a normal module (not a Route Handler)
 * so Turbopack/Next can import it from API routes, server actions, and the BFF proxy.
 */
export const authOptions: NextAuthOptions = {
  adapter: fraudchillsPostgresAdapter(pool),
  secret: process.env.NEXTAUTH_SECRET,
  // Required when using Credentials alongside a DB adapter; database sessions break that combo
  // and often surface as OAuth `error=Callback` when the auth flow shares the same config.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const r = await pool.query(
          `SELECT id, name, email, image, password, role FROM users WHERE email = $1`,
          [credentials.email]
        );
        if (r.rowCount === 0) return null;
        const row = r.rows[0] as {
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
          password: string | null;
          role: string | null;
        };
        if (!row.password) return null;
        const ok = await bcrypt.compare(credentials.password as string, row.password);
        if (!ok) return null;
        return {
          id: row.id,
          email: row.email ?? undefined,
          name: row.name ?? undefined,
          image: row.image ?? undefined,
          role: row.role ?? "CUSTOMER",
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  debug: process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "1",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        // ignore
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "CUSTOMER";
      }
      return session;
    },
  },
};
