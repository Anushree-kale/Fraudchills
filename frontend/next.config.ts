import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Repo has a root package.json for Vercel; pin Turbopack to this app directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Native driver + NextAuth adapter: bundling pg for serverless can break OAuth DB callbacks on Vercel.
  serverExternalPackages: ["pg", "@auth/pg-adapter"],
};

export default nextConfig;
