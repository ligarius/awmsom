/**
 * Next.js configuration tuned for the WMS SaaS frontend foundation.
 * This file intentionally stays small; domain-specific configuration
 * (headers, rewrites, etc.) should be added in future sprints.
 */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true
  }
};

export default nextConfig;
