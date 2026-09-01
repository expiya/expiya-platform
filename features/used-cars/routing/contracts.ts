export const USED_CARS_ROUTE_CONTRACT = Object.freeze({
  version: "used-cars-routing/v1",
  currentPublicBasePath: "/ikinciel",
  futurePublicBasePath: "/cars/ikinciel",
  futureCarsBasePath: "/cars",
  partnerOrigin: "https://partner.expiya.com",
  platformOrigin: "https://www.expiya.com",
  permanentLegacyRedirectRequired: true,
  partnerAuthenticationSharedWithB2c: false,
  partnerAuthorizationSharedWithB2c: false,
  partnerDataAccessSharedWithB2c: false,
} as const);

export type UsedCarsSurface = "PUBLIC_B2C" | "PARTNER" | "EXPIYA_OPERATIONS" | "UNKNOWN";

export function classifyUsedCarsSurface(url: URL): UsedCarsSurface {
  if (url.hostname === "partner.expiya.com") return "PARTNER";
  if ((url.hostname === "expiya.com" || url.hostname === "www.expiya.com")
    && (url.pathname === "/ikinciel" || url.pathname.startsWith("/ikinciel/") || url.pathname === "/cars/ikinciel" || url.pathname.startsWith("/cars/ikinciel/"))) return "PUBLIC_B2C";
  return "UNKNOWN";
}

export function buildFutureUsedCarsUrl(currentPath: string): string {
  if (currentPath !== "/ikinciel" && !currentPath.startsWith("/ikinciel/")) throw new Error("NOT_A_USED_CARS_LEGACY_PATH");
  return currentPath.replace(/^\/ikinciel(?=\/|$)/u, "/cars/ikinciel");
}

