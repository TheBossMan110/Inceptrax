// Sentry client-side configuration
// This file configures Sentry for the browser (client components).
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance — 10% of transactions sampled (free tier friendly)
    tracesSampleRate: 0.1,

    // Session replay — disabled for now (costs events)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Don't send PII
    sendDefaultPii: false,

    // Filter noisy browser errors
    beforeSend(event) {
      // Skip ResizeObserver errors (benign, caused by browser internals)
      if (event.exception?.values?.[0]?.value?.includes("ResizeObserver")) {
        return null;
      }
      return event;
    },

    // Only report errors from our domain
    allowUrls: [
      /https?:\/\/(www\.)?inceptrax\.com/,
      /http:\/\/localhost/,
    ],
  });
}
