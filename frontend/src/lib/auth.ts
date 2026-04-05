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
 * @auth/pg-adapter createUser() does not send `id`. Production DBs without
 * DEFAULT gen_random_uuid() on users.id raise NOT NULL — fix DB with
 * backend/migrations/005_users_id_default_uuid.sql; this supplies id in app as well.
 */
function fraudchillsPostgresAdapter(client: Pool): Adapter {
  const base = PostgresAdapter(client);
  return {
    ...base,
    async createUser(user: Omit<AdapterUser, "id">) {
      const id = randomUUID();
      const { name, email, emailVerified, image } = user;
      const sql = `
        INSERT INTO users (id, name, email, "emailVerified", image)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, "emailVerified", image`;
      const result = await client.query(sql, [id, name, email, emailVerified, image]);
      return result.rows[0];
    },
  };
}

/**
 * Shared NextAuth configuration. Lives in a normal module (not a Route Handler)
 * so Turbopack/Next can import it from API routes, server actions, and the BFF proxy.
 */
export const authOptions: NextAuthOptions = {
  adapter: fraudchillsPostgresAdapter(pool),
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
    newUser: "/auth/signup",
  },
  // Enable debug in production temporarily to troubleshoot the redirect mismatch.
  // Check your Vercel logs to see the exact URL being sent to Google.
  debug: true,
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
      if (session?.user && user) {
        session.user.id = user.id;
        session.user.role = user.role ?? "CUSTOMER";
      }
      return session;
    },
  },
};
