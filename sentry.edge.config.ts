import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/monitoring/sentryPrivacy";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  maxBreadcrumbs: 0,
  beforeSend: scrubSentryEvent,
});
