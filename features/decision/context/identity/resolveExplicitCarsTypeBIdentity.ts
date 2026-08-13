import { acquireBoundedCarsCatalog } from "@/features/decision/context/acquisition/acquireBoundedCarsCatalog";
import { createCarsTypeBCanonicalCandidate } from "@/features/decision/context/extraction/createCarsTypeBCanonicalCandidate";
import type { CarsTypeBCanonicalCandidateProduction } from "@/features/decision/context/extraction/createCarsTypeBCanonicalCandidate";

export type ExplicitCarsTypeBIdentityResult =
  | {
      readonly status: "RESOLVED";
      readonly production: CarsTypeBCanonicalCandidateProduction;
    }
  | {
      readonly status: "UNRESOLVED";
      readonly reason:
        | "CATALOG_UNAVAILABLE"
        | "TOO_FEW_EXPLICIT_CANDIDATES";
    };

export interface ResolveExplicitCarsTypeBIdentityInput {
  readonly query: string;
  readonly userConfirmationReferenceId: string;
  readonly candidateId: string;
}

export interface CarsIdentityCatalogEntry {
  readonly id: string;
  readonly brand: string;
  readonly model: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function explicitlyMentions(
  query: string,
  brand: string,
  model: string,
): boolean {
  const normalizedQuery = query.normalize("NFKC").toLocaleLowerCase("en-US");
  const canonicalName = `${brand} ${model}`
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ");
  const flexibleWhitespaceName = canonicalName
    .split(" ")
    .map(escapeRegExp)
    .join("\\s+");

  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${flexibleWhitespaceName}(?=$|[^\\p{L}\\p{N}])`,
    "u",
  ).test(normalizedQuery);
}

export function resolveExplicitCarsTypeBIdentity(
  input: ResolveExplicitCarsTypeBIdentityInput,
): ExplicitCarsTypeBIdentityResult {
  const acquisition = acquireBoundedCarsCatalog();

  if (!acquisition.ok) {
    return {
      status: "UNRESOLVED",
      reason: "CATALOG_UNAVAILABLE",
    };
  }

  return resolveExplicitCarsTypeBIdentityFromCatalog(
    input,
    acquisition.value.catalog,
    acquisition.value.trace.sourceId,
  );
}

export function resolveExplicitCarsTypeBIdentityFromCatalog(
  input: ResolveExplicitCarsTypeBIdentityInput,
  catalog: readonly CarsIdentityCatalogEntry[],
  sourceId: string,
): ExplicitCarsTypeBIdentityResult {
  const mentionedNameplates = new Set(
    catalog
      .filter((car) => explicitlyMentions(input.query, car.brand, car.model))
      .map((car) => `${car.brand}\u0000${car.model}`),
  );
  if (mentionedNameplates.size < 2) {
    return { status: "UNRESOLVED", reason: "TOO_FEW_EXPLICIT_CANDIDATES" };
  }

  const selections = catalog
    .filter((car) =>
      explicitlyMentions(input.query, car.brand, car.model),
    )
    .map((car) => ({
      optionId: car.id,
      domainSourceReferenceId: `${sourceId}#${car.id}`,
    }));

  if (selections.length < 2) {
    return {
      status: "UNRESOLVED",
      reason: "TOO_FEW_EXPLICIT_CANDIDATES",
    };
  }

  return {
    status: "RESOLVED",
    production: createCarsTypeBCanonicalCandidate(
      {
        selections,
        userConfirmationReferenceId:
          input.userConfirmationReferenceId,
      },
      () => input.candidateId,
    ),
  };
}
