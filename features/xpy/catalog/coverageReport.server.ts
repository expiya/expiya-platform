import type { XpyCatalogAuthorityAudit } from "./contract";
import { XPY_CATALOG_VERSION } from "./contract";
import { auditActiveXpyCatalogAuthorities } from "./adapters.server";

export const XPY_CATALOG_INVARIANTS = Object.freeze([
  "TechnicalFact != DailyLifeInterpretation",
  "Capability != UserNeed",
  "Persona != user fact",
  "Experience != technical truth",
  "Advisor knowledge/manual != decision authority",
  "Offer != identity",
  "Affiliate != ranking authority",
]);

const ENRICHMENT_WORK_UNITS = Object.freeze([
  { sequence: 1, workUnitId: "WU-XPY-CARS-OWNER-MANUAL-EXACT-TR-PILOT-01", categories: ["NEW_CAR"], objective: "Resolve exact-TR owner-manual applicability for eight source-available variants and promote only reviewed exact assertions." },
  { sequence: 2, workUnitId: "WU-XPY-CARS-EQUIPMENT-EVIDENCE-BATCH-01", categories: ["NEW_CAR"], objective: "Completed: seven bounded source attempts and fourteen independently reviewed, owner-pending exact association proposals." },
  { sequence: 3, workUnitId: "WU-XPY-CARS-DAILY-LIFE-HIGH-MATERIALITY-01", categories: ["NEW_CAR"], objective: "Partial complete: 20 owner-evidence-bound exact applications across five priority variants; public activation and 8,646 technical-field mappings remain outside the release." },
  { sequence: 4, workUnitId: "WU-XPY-CARS-PERSONA-QUALITY-REMAINDER-01", categories: ["NEW_CAR"], objective: "Resolve the remaining four empty/unresolved persona projections while preserving soft-only planning authority." },
  { sequence: 5, workUnitId: "WU-XPY-CARS-COMPARISON-ADVISOR-COMPLETENESS-01", categories: ["NEW_CAR"], objective: "Recompute per-variant Advisor and comparison readiness after evidence enrichment without broadening decision authority." },
  { sequence: 6, workUnitId: "WU-XPY-APPL-DRYER-CATALOG-RICHNESS-01", categories: ["DRYER"], objective: "Partial complete: immutable three-product assertion/semantic/read-projection child is generated; KM 99 manual and Product-owner activation remain open without affecting AŞAMA 1." },
  { sequence: 7, workUnitId: "WU-XPY-REFRIGERATOR-SEMANTIC-EVIDENCE-01", categories: ["REFRIGERATOR"], objective: "Add assertion-level provenance and versioned L3-L6/L8-L9 authorities while preserving unknown/conflicted measurements." },
  { sequence: 8, workUnitId: "WU-XPY-DISHWASHER-SEMANTIC-EVIDENCE-01", categories: ["DISHWASHER"], objective: "Add explicit Need-to-Evidence and interpretation authorities." },
  { sequence: 9, workUnitId: "WU-XPY-VACUUM-SEMANTIC-EVIDENCE-01", categories: ["VACUUM"], objective: "Add explicit evidence eligibility, usage semantics, and interpretation authorities." },
  { sequence: 10, workUnitId: "WU-XPY-ROBOT-VACUUM-SEMANTIC-EVIDENCE-01", categories: ["ROBOT_VACUUM"], objective: "Add explicit evidence eligibility, privacy-aware usage semantics, and interpretation authorities." },
  { sequence: 11, workUnitId: "WU-XPY-WM-INTERPRETATION-MANUAL-01", categories: ["WASHING_MACHINE"], objective: "Populate reviewed product-bound L6 and exact-applicability L9 records behind the existing schemas." },
]);

export const NEXT_CATALOG_EXECUTION_PROMPT = `EXPIYA PLATFORM — WU-XPY-APPL-NEW-CATEGORY-PORTFOLIO-AUTHORITY-01

Define the next Appliances category portfolio authority as a separate bounded work unit. Preserve all six active category authorities, unknown/conflict neutrality, unchanged decision/Y semantics, exact-set comparison, read-only Advisor behavior, and external commerce/media boundaries.`;

export interface XpyCatalogCoverageReport {
  readonly schemaVersion: "XPY_CATALOG_COVERAGE/v0.1";
  readonly catalogContractVersion: typeof XPY_CATALOG_VERSION;
  readonly generatedAt: string;
  readonly repositoryAuthority: "ACTIVE_POINTERS_AND_PINNED_RELEASES_ONLY";
  readonly machineReadableArtifacts: { readonly carsExactVariantGapInventory: string; readonly generationScript: string };
  readonly authorityBoundaries: readonly string[];
  readonly invariants: readonly string[];
  readonly productVsService: {
    readonly commonEnvelope: string;
    readonly productIdentity: string;
    readonly serviceIdentity: string;
    readonly fixtureOnlyNotice: string;
  };
  readonly audits: readonly XpyCatalogAuthorityAudit[];
  readonly enrichmentPlan: typeof ENRICHMENT_WORK_UNITS;
  readonly nextWorkUnit: { readonly workUnitId: string; readonly executionPrompt: string };
}

export async function buildXpyCatalogCoverageReport(root: string, generatedAt = new Date().toISOString()): Promise<XpyCatalogCoverageReport> {
  const audits = await auditActiveXpyCatalogAuthorities(root);
  return Object.freeze({
    schemaVersion: "XPY_CATALOG_COVERAGE/v0.1",
    catalogContractVersion: XPY_CATALOG_VERSION,
    generatedAt,
    repositoryAuthority: "ACTIVE_POINTERS_AND_PINNED_RELEASES_ONLY",
    machineReadableArtifacts: Object.freeze({ carsExactVariantGapInventory: "data/governance/xpy-catalog/v0.1/cars-exact-variant-gap-inventory.json", generationScript: "scripts/generate-xpy-catalog-coverage.ts" }),
    authorityBoundaries: Object.freeze([
      "Frozen technical and semantic releases are digest-bound authority.",
      "Daily-life interpretation is a traced, non-technical layer.",
      "Persona is bounded domain planning and has no direct eligibility or ranking authority.",
      "Experience evidence cannot establish technical truth.",
      "Manual and Advisor knowledge require governed promotion before L1 or L8 use.",
      "Merchant offers, affiliate state, prices, and media are volatile external snapshots joined only by exact identity.",
      "AŞAMA 2 Sales Advisor is separate from XPY/X and receives only an authorized read projection.",
      "Paid comparison evidence is exposed only after purchase entitlement and an exact authorized comparison set.",
      "Unknown comparison cells are neutral; unit or scope incompatibility fails closed; dimensions and human labels belong to Domain Packs.",
      "Cars is an architecture/richness reference, not a content-complete gold catalog; exact-variant UNKNOWN, ABSENT, and NOT_APPLICABLE states remain distinct.",
    ]),
    invariants: XPY_CATALOG_INVARIANTS,
    productVsService: Object.freeze({
      commonEnvelope: "Market, lifecycle, version/digest, source/evidence provenance, layer separation, compatibility, external joins, Advisor reads, and paid-comparison authorization are shared.",
      productIdentity: "Manufacturer, model, exact configuration, and product identifiers.",
      serviceIdentity: "Provider, named service, plan, governed scope, location/date/SLA dimensions when applicable, and service version; no vehicle trim or appliance model fields.",
      fixtureOnlyNotice: "The service-shaped test fixture proves contract shape only and is not a production Department, catalog, or policy.",
    }),
    audits,
    enrichmentPlan: ENRICHMENT_WORK_UNITS,
    nextWorkUnit: Object.freeze({ workUnitId: "WU-XPY-APPL-NEW-CATEGORY-PORTFOLIO-AUTHORITY-01", executionPrompt: NEXT_CATALOG_EXECUTION_PROMPT }),
  });
}
