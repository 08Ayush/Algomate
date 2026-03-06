import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Route handler params in Next.js 15 are Promise-based; suppress type validation during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint errors are downgraded to warnings in eslint.config.mjs; prevent blocking build
    ignoreDuringBuilds: false,
  },
  // Exclude Node.js-only packages from client bundle (Next.js 15+)
  serverExternalPackages: ['pg', 'pg-native'],
  // Webpack configuration (fallback when not using Turbopack)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
      };
    }
    return config;
  },
};

export default nextConfig;
