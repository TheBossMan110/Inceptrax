// Sentry server-side configuration
// This file configures Sentry for Node.js server components and API routes.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance — 10% of transactions
    tracesSampleRate: 0.1,

    // Don't send PII
    sendDefaultPii: false,
  });
}
