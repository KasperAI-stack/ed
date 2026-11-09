import type { NextConfig } from "next";

// På GitHub Pages ligger siden i undermappen /ed/case. Lokalt ligger den i roden.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Statisk side: GitHub Pages kan kun vise filer, så alt bygges til HTML, CSS og JS.
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
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
