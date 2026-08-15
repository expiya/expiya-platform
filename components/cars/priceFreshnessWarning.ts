import type { RecommendedCarPricePresentation } from "@/types/recommendation";

export function priceFreshnessWarning(
  price: RecommendedCarPricePresentation | undefined,
  locale: "tr" | "en" = "tr",
): string | undefined {
  if (price?.validityStatus !== "EXPIRED") return undefined;

  // Price-list validity is a calendar date; normalize at midday so a timestamp offset
  // cannot move the user-facing date into the previous or following day.
  const datePart = price.validUntil?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const parsed = datePart ? new Date(`${datePart}T12:00:00.000Z`) : undefined;
  const hasValidDate = parsed && !Number.isNaN(parsed.getTime());
  if (!hasValidDate) {
    return locale === "tr"
      ? "Bu fiyat güncel olmayabilir. Fiyat kaydının geçerlilik tarihi sona ermiştir."
      : "This price may be out of date. The price record has expired.";
  }

  const formatted = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(parsed);
  return locale === "tr"
    ? `Güncel olmayabilir · ${formatted} tarihine kadar geçerli fiyat`
    : `May be out of date · price valid until ${formatted}`;
}
