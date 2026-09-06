import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/analysis",
        "/decision/",
        "/pilot",
        "/cars/analysis",
        "/cars/decision/",
        "/cars/variant/",
        "/cars/sales-request/",
        "/appliances/analysis",
        "/appliances/stage/",
        "/ikinciel/eslestirme",
        "/ikinciel/tercihler",
        "/ikinciel/partner-demo",
        "/ops-demo",
      ],
    },
    sitemap: "https://www.expiya.com/sitemap.xml",
  };
}
