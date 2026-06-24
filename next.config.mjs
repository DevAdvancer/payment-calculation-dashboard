import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack hook (used when `next dev` / `next build` is run without
  // --turbopack). Mirrors the @/ → projectRoot alias for any tools
  // that still rely on webpack.
  webpack(config) {
    config.resolve.alias["@"] = path.resolve(projectRoot);
    return config;
  },
  // Turbopack is the default builder in Next.js 16; mirror the same
  // path alias there.
  turbopack: {
    resolveAlias: {
      "@": path.resolve(projectRoot),
    },
  },
};

export default nextConfig;

