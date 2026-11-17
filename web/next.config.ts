import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",          // fully static site: pages read the JSON files in public/data (no backend)
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
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
