import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",          // static site, served by the FastAPI service (single deployable)
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
