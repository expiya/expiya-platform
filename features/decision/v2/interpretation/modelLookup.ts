import type { CatalogSnapshot } from "../catalog/types";
import { lookupCatalogModel, type CatalogModelLookupResult } from "../catalog/lookup";
import type { ProposedModelReference } from "./types";
export function resolveProposedModelReferences(snapshot: CatalogSnapshot, references: readonly ProposedModelReference[]): readonly CatalogModelLookupResult[] { return Object.freeze(references.map((reference) => lookupCatalogModel(snapshot, { rawText: reference.rawText, brand: reference.parsedBrandText, model: reference.parsedModelText, purpose: reference.purpose === "COMPARISON_SCOPE" ? "COMPARISON" : reference.purpose === "LOOKUP_ONLY" ? "AVAILABILITY" : "REFERENCE" }))); }
