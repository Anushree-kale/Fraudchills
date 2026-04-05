import type { NextConfig } from "next";
import path from "path";

// NextAuth needs an absolute URL for OAuth callbacks. Vercel sets VERCEL_URL (no scheme).
const vercelOrigin =
  process.env.VERCEL_URL && !process.env.NEXTAUTH_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;

const nextConfig: NextConfig = {
  env: {
    ...(vercelOrigin ? { NEXTAUTH_URL: vercelOrigin } : {}),
  },
  // Repo has a root package.json for Vercel; pin Turbopack to this app directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
