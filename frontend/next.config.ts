import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Repo has a root package.json for Vercel; pin Turbopack to this app directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
