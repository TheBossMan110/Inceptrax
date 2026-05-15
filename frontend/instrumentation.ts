// Next.js instrumentation file — used to initialize Sentry on the server side.
// This is the recommended approach for Next.js 15+ (App Router).
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamically import server config to avoid bundling issues
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Re-export the Sentry error hook for automatic error capturing
// (renamed from onRequestError → captureRequestError in @sentry/nextjs v10.x)
export { captureRequestError as onRequestError } from "@sentry/nextjs";
