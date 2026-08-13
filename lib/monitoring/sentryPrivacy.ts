import type { ErrorEvent } from "@sentry/nextjs";

function stripQuery(value: string | undefined): string | undefined {
  if (!value) return value;
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value.split("?", 1)[0];
  }
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  const request = event.request
    ? { method: event.request.method, url: stripQuery(event.request.url) }
    : undefined;
  return { ...event, breadcrumbs: [], extra: undefined, request, user: undefined };
}
