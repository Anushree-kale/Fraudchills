import type { NextConfig } from "next";

// NextAuth needs an absolute URL for OAuth callbacks. Vercel sets VERCEL_URL (no scheme).
const vercelOrigin =
  process.env.VERCEL_URL && !process.env.NEXTAUTH_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;

const nextConfig: NextConfig = {
  env: {
    ...(vercelOrigin ? { NEXTAUTH_URL: vercelOrigin } : {}),
  },
};

export default nextConfig;
