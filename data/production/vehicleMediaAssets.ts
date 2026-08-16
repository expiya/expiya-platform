import type { VehicleMediaAsset } from "@/types/vehicleMedia";

/**
 * Runtime media registry. Only PUBLISHED assets with an accepted permission
 * basis belong here. OWNER_ATTESTED records require a complete, auditable owner
 * declaration; discovered public URLs cannot self-attest.
 */
const ownerAttestation = {
  attestedBy: "Expiya catalog owner",
  attestedAt: "2026-08-16T10:35:00.000Z",
  statement: "The Expiya catalog owner selected the OWNER_ATTESTED workflow and authorized collection and commercial display in the active Codex task.",
  evidenceReference: "codex-task:owner-attested-approval:2026-08-16",
  permittedUses: ["COMMERCIAL_DISPLAY"] as const,
};

export const productionVehicleMediaAssets: readonly VehicleMediaAsset[] = Object.freeze([
  {
    id: "media-alfa-romeo-junior-suv-v055",
    market: "TR",
    scope: "MODEL_BODY",
    brand: "Alfa Romeo",
    model: "Junior",
    bodyStyle: "SUV",
    modelYearFrom: 2026,
    modelYearTo: 2026,
    kind: "HERO_EXTERIOR",
    storagePath: "https://wylflrzf7gws55yp.public.blob.vercel-storage.com/cars/v0.55.0/alfa-romeo/junior/28a51dc688aa1af4.png",
    sourcePageUrl: "https://www.alfaromeo.com.tr/arac-modelleri/junior-elettrica",
    originalAssetUrl: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/anasayfa/model-card/model-junior/Junior_Elettrica_1_580x344.png",
    rightsHolder: "Alfa Romeo / Stellantis",
    usagePermission: "OWNER_ATTESTED",
    ownerAttestation,
    publicationState: "PUBLISHED",
    isPrimary: true,
    reviewedAt: "2026-08-16T10:40:25.117Z",
    fileHash: "sha256:28a51dc688aa1af4513c0abd805baf2e5fb98c377209d979ed1a901ead8fbdea",
    applicabilityNotes: ["Official Turkey-market Junior Elettrica model-card asset", "Representative across Junior SUV configurations; trim and color may differ"],
  },
  {
    id: "media-alfa-romeo-tonale-suv-v055",
    market: "TR",
    scope: "MODEL_BODY",
    brand: "Alfa Romeo",
    model: "Tonale",
    bodyStyle: "SUV",
    modelYearFrom: 2026,
    modelYearTo: 2026,
    kind: "HERO_EXTERIOR",
    storagePath: "https://wylflrzf7gws55yp.public.blob.vercel-storage.com/cars/v0.55.0/alfa-romeo/tonale/a6af9ec2e612f58f.png",
    sourcePageUrl: "https://www.alfaromeo.com.tr/arac-modelleri/yeni-tonale",
    originalAssetUrl: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/modeller/tonale-2026/renk/s1-a3-b12-c2.jpg",
    rightsHolder: "Alfa Romeo / Stellantis",
    usagePermission: "OWNER_ATTESTED",
    ownerAttestation,
    publicationState: "PUBLISHED",
    isPrimary: true,
    reviewedAt: "2026-08-16T10:40:26.846Z",
    fileHash: "sha256:a6af9ec2e612f58f7704dbc612167e508a8e49e272cc524a84005de5f387073a",
    applicabilityNotes: ["Official Turkey-market Tonale 2026 colorizer asset", "Representative across Tonale SUV configurations; trim and color may differ"],
  },
]);
