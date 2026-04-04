import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

/**
 * Shared NextAuth configuration. Lives in a normal module (not a Route Handler)
 * so Turbopack/Next can import it from API routes, server actions, and the BFF proxy.
 */
export const authOptions: NextAuthOptions = {
  adapter: PostgresAdapter(pool),
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
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
      if (session?.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
  },
};
