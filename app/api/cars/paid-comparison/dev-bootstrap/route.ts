import { createProductionCatalogReleaseRepository } from "@/features/decision/v2/catalog/fileSystemRepository.server";
import { loadActiveCatalogSnapshot } from "@/features/decision/v2/catalog/snapshot";
import { createDevPaidComparisonHandoff } from "@/features/paid-comparison/devFixture.server";
import { assessPaidComparisonEligibility, listPaidComparisonAlternatives } from "@/features/paid-comparison/eligibility";
import { resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";

export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV === "production") return Response.json({ message: "Bu test başlangıcı yalnızca yerel geliştirme ortamında kullanılabilir." }, { status: 404 });
  const loaded = await loadActiveCatalogSnapshot({ repository: createProductionCatalogReleaseRepository(process.cwd()), now: new Date() });
  if (loaded.status !== "READY") return Response.json({ message: "Yerel katalog hazırlanamadı." }, { status: 503 });

  const candidates = loaded.snapshot.variants
    .map((variant) => {
      const alternatives = listPaidComparisonAlternatives({ decisionVariantId: variant.id, variants: loaded.snapshot.variants });
      const image = resolveVehicleImage({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: variant.decisionFacts.bodyStyle.value, modelYear: variant.decisionFacts.modelYear.value });
      const picturedAlternatives = alternatives.filter((item) => resolveVehicleImage({ variantId: item.id, brand: item.brand, model: item.model, bodyStyle: item.decisionFacts.bodyStyle.value, modelYear: item.decisionFacts.modelYear.value }).status !== "PLACEHOLDER");
      const quoteEligibility = picturedAlternatives.length >= 2 ? assessPaidComparisonEligibility({ decisionVariantId: variant.id, alternativeVariantIds: [picturedAlternatives[0]!.id, picturedAlternatives[1]!.id], variants: loaded.snapshot.variants }) : { eligible: false as const };
      return { variant, alternatives, decisionHasImage: image.status !== "PLACEHOLDER", picturedAlternatives: picturedAlternatives.length, quoteEligible: quoteEligibility.eligible, mediaScore: (image.status === "PLACEHOLDER" ? 0 : 10) + picturedAlternatives.length };
    })
    .filter((item) => item.alternatives.length >= 2 && item.decisionHasImage && item.picturedAlternatives >= 2 && item.quoteEligible)
    .sort((left, right) => right.mediaScore - left.mediaScore || left.variant.id.localeCompare(right.variant.id));

  const selected = candidates[0]?.variant;
  if (!selected) return Response.json({ message: "Aynı sınıfta iki alternatifi bulunan test varyantı bulunamadı." }, { status: 503 });
  const token = createDevPaidComparisonHandoff({ exactVariantId: selected.id, bodyStyle: selected.decisionFacts.bodyStyle.value, catalogRelease: loaded.snapshot.authority.releaseVersion, catalogFingerprint: loaded.snapshot.authority.catalogFingerprint });
  return Response.json({ token, exactVariantId: selected.id, title: `${selected.brand} ${selected.model} ${selected.trim}` }, { headers: { "Cache-Control": "no-store" } });
}
