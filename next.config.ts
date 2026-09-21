import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    if (process.env.INFINITY_HQ_SURFACE !== "1" && process.env.VERCEL_PROJECT_PRODUCTION_URL !== "hq.imros.io") {
      return [];
    }
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  turbopack: {
    resolveAlias: {
      "server-only": "./lib/infinity/server-client-boundary/server-only-package",
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      const ignored = config.watchOptions?.ignored;
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          ...(Array.isArray(ignored) ? ignored : ignored ? [ignored] : []),
          "**/.infinity/**",
          "**/.git/**",
          "**/node_modules/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
