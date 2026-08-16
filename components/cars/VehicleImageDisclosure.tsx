import type { Car } from "@/types/car";

interface VehicleImageDisclosureProps {
  readonly imageStatus?: Car["imageStatus"];
  readonly imageRepresentativeOf?: string;
  readonly imageAttribution?: string;
  readonly locale?: "tr" | "en";
}

export function approximateImageMessage(
  representedModel: string | undefined,
  locale: "tr" | "en" = "tr",
): string {
  if (locale === "en") {
    return representedModel
      ? `Representative image: This photo shows the ${representedModel}. The recommended vehicle may differ in body style, trim, model year, and appearance.`
      : "Representative image: This may not be an exact image of the recommended vehicle. Body style, trim, model year, and appearance may differ.";
  }
  return representedModel
    ? `Temsilî görsel: Bu fotoğraf ${representedModel} modeline aittir. Önerilen aracın kasa, donanım, model yılı ve görünümü farklı olabilir.`
    : "Temsilî görsel: Bu fotoğraf önerilen aracın birebir görüntüsü olmayabilir. Kasa, donanım, model yılı ve görünüm farklılık gösterebilir.";
}

export function VehicleImageDisclosure({
  imageStatus,
  imageRepresentativeOf,
  imageAttribution,
  locale = "tr",
}: VehicleImageDisclosureProps) {
  const approximateMessage = imageStatus === "APPROXIMATE"
    ? approximateImageMessage(imageRepresentativeOf, locale)
    : undefined;
  if (!approximateMessage && !imageAttribution) return null;

  return (
    <div className="space-y-1.5 border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-5 dark:border-neutral-700 dark:bg-neutral-900">
      {approximateMessage && (
        <p role="note" className="break-words text-amber-900 dark:text-amber-200">
          {approximateMessage}
        </p>
      )}
      {imageAttribution && (
        <p className="break-words text-neutral-500 dark:text-neutral-400">
          {locale === "tr" ? "Görsel kaynağı" : "Image attribution"}: {imageAttribution}
        </p>
      )}
    </div>
  );
}
