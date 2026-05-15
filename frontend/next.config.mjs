import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker — produces a self-contained server.js
  // that includes only the necessary node_modules files
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

// Wrap with Sentry — only applies build-time source map upload if SENTRY_AUTH_TOKEN is set.
// In development or without the token, this is a no-op wrapper.
export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: true,

  // Upload source maps only if auth token is available (production CI only)
  org: "inceptrax",
  project: "inceptrax-frontend",

  // Hide source maps from users in production
  hideSourceMaps: true,

  // Disable Sentry webpack plugin telemetry
  telemetry: false,
});
