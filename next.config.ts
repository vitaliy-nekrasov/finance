import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (dev-only local DB) loads wasm/data files from its own dist folder.
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
