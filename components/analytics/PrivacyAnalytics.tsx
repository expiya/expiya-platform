"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

const dynamicPathRules: readonly [RegExp, string][] = [
  [/^\/decision\/[^/]+$/u, "/decision/[id]"],
  [/^\/cars\/variant\/[^/]+$/u, "/cars/variant/[id]"],
  [/^\/cars\/sales-request\/[^/]+$/u, "/cars/sales-request/[intent]"],
];

export function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    const safePath = dynamicPathRules.find(([pattern]) => pattern.test(url.pathname))?.[1] ?? url.pathname;
    return { ...event, url: `${url.origin}${safePath}` };
  } catch {
    return null;
  }
}

export function PrivacyAnalytics() {
  return <Analytics beforeSend={sanitizeAnalyticsEvent} />;
}
