import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SourceReference } from "./contract";
import { immutableDigest } from "./canonical";
import { buildSoftDirectionalProjection } from "./wave1CoreDomains";

type Json = Record<string, unknown>;
export async function buildWave3CarsProjection(root: string) {
  const pointer = JSON.parse(await readFile(path.join(root, "data/production/catalog/active.json"), "utf8")) as { active_catalog_release_version: string; catalog_payload_hash: `sha256:${string}` };
  const catalog = JSON.parse(await readFile(path.join(root, `data/production/catalog/releases/v${pointer.active_catalog_release_version}/catalog.json`), "utf8")) as { records: { variant: Json }[] };
  const sources = new Map<string, SourceReference>();
  const candidates = catalog.records.map(({ variant }) => {
    const dimensions = variant.dimensions as Json | undefined, seatFact = dimensions?.seats as Json | undefined, provenance = Array.isArray(seatFact?.provenance) ? seatFact.provenance as Json[] : [];
    for (const item of provenance) if (typeof item.sourceId === "string") sources.set(item.sourceId, Object.freeze({ sourceId: item.sourceId, authority: "PRIMARY", digest: immutableDigest(item), market: "TR", capturedAt: String(item.accessedAt ?? "2026-09-08T00:00:00.000+03:00"), reliability: item.confidence === "HIGH" ? 0.95 : 0.8, locator: String(item.sourceUrl ?? item.documentVersion ?? "cars-production-provenance") }));
    const brand = (variant.brand as Json | undefined)?.value, model = (variant.model as Json | undefined)?.value, trim = (variant.trim as Json | undefined)?.value;
    return { id: String(variant.id), configurationId: `${String(brand)}|${String(model)}|${String(trim)}|${String(variant.id)}`, fact: typeof seatFact?.value === "number" ? seatFact.value : "UNKNOWN" as const, evidenceIds: Object.freeze(provenance.flatMap((item) => typeof item.sourceId === "string" ? [item.sourceId] : [])) };
  });
  return buildSoftDirectionalProjection({ departmentId: "CARS", categoryId: "NEW_CAR", authorityVersion: pointer.active_catalog_release_version, authorityDigest: pointer.catalog_payload_hash, projectionId: "wave3.cars.seven-seat-daily-use", questionId: "p.cars.seven-seat-daily-use", questionTr: "Düzenli olarak sürücü dahil en az 7 kişi taşıyacağınız için 7 veya daha fazla koltuk önemli mi?", needId: "cars.daily-seven-seat-capacity", needTr: "Düzenli altı yolcu ve sürücü için kanıtlı oturma yeri kapasitesi", field: "dimensions.seats", operator: "GTE", threshold: 7, unit: "seats", context: "Düzenli altı yolcu ve sürücü taşıma; koltuk kullanılabilirliği ve çocuk koltuğu uyumu ayrıca doğrulanır", regime: "EXACT_TR_VARIANT_SEAT_COUNT", candidates, sources: Object.freeze([...sources.values()].sort((left, right) => left.sourceId.localeCompare(right.sourceId))), qualifies: (value) => typeof value === "number" && value >= 7 });
}
