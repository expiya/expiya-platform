import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import catalog from "@/data/production/catalog/releases/v0.55.1/catalog.json";
import assertions from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/assertions.json";
import batchLifecycle from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/batch-lifecycle.json";
import checksums from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/checksums.json";
import comparison from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/trim-comparison.json";
import ledger from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/research-ledger.json";
import packageLinks from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/package-links.json";
import pilotLifecycle from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/pilot-lifecycle.json";
import reviewEvents from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/review-events.json";
import snapshots from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/snapshots/index.json";
import sourceInventory from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/source-inventory.json";
import trimDrafts from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/trim-identity-drafts.json";
import trimLinks from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/trim-links.json";
import { createCanonicalTrimId } from "./equipmentCanonicalIdentity";

const variants = ["6fd52c36-be09-5918-a70f-c5b8b3aba511", "ec80fc69-2bfd-566e-bbb8-ebd5ab1c9a36"];
const sha = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const assertionRecords = assertions as readonly { readonly conflictState: string; readonly availabilityStatus: string }[];

describe("EE-PILOT-001 Batch 001 bounded collection", () => {
  it("contains exactly 102 unique researched dispositions", () => { expect(ledger).toHaveLength(102); expect(new Set(ledger.map((item) => `${item.exactVariantId}|${item.featureCode}`)).size).toBe(102); });
  it("leaves no feature NOT_RESEARCHED", () => { expect(ledger.filter((item) => item.disposition === "NOT_RESEARCHED")).toEqual([]); expect(ledger.every((item) => item.disposition === "RESEARCHED_INCONCLUSIVE")).toBe(true); });
  it("does not create absence claims from inconclusive research", () => { expect(assertions).toEqual([]); expect(ledger.every((item) => item.assertionIds.length === 0)).toBe(true); });
  it("uses only the two pinned exact catalog variants", () => { expect(new Set(ledger.map((item) => item.exactVariantId))).toEqual(new Set(variants)); expect(variants.every((id) => catalog.records.some((record) => record.variant.id === id))).toBe(true); });
  it("binds every row to the fixed collector, cycle and batch", () => { expect(ledger.every((item) => item.collectorRole === "EQUIPMENT_COLLECTOR_PRIMARY" && item.collectorInstanceId === "ACTOR-COLLECTOR-CODEX-CATALOG-001" && item.researchCycleId === "EE-PILOT-001-CYCLE-001" && item.batchId === "EE-PILOT-001-BATCH-001")).toBe(true); });
  it("checksum-verifies all canonical source snapshots", () => { expect(snapshots).toHaveLength(3); for (const item of snapshots) expect(`sha256:${sha(readFileSync(item.canonicalArtifactReference))}`).toBe(item.artifactSha256); });
  it("uses official TR sources with immutable provenance", () => { expect(sourceInventory).toHaveLength(3); expect(sourceInventory.every((item) => item.market === "TR" && item.snapshotResult === "CAPTURED" && item.artifactSha256.startsWith("sha256:") && item.sourceRegistryRelease.includes("v0.4.0"))).toBe(true); });
  it("does not create unverified exact trim links", () => { expect(trimLinks).toEqual([]); expect(trimDrafts).toHaveLength(2); expect(trimDrafts.every((item) => item.linkStatus === "NOT_CREATED")).toBe(true); });
  it("keeps canonical trim candidate IDs deterministic", () => { for (const item of trimDrafts) expect(item.deterministicCandidateCanonicalTrimId).toBe(createCanonicalTrimId({ market: "TR", brand: "Dacia", modelFamily: "Jogger", modelYear: 2026, trimName: item.catalogTrim, configurationIdentity: item.exactVariantId })); });
  it("does not invent package links", () => { expect(packageLinks).toEqual([]); });
  it("reports every trim comparison as inconclusive for both", () => { expect(comparison).toHaveLength(51); expect(comparison.every((item) => item.status === "INCONCLUSIVE_FOR_BOTH" && item.essentialAssertionIds.length === 0 && item.expressionAssertionIds.length === 0)).toBe(true); });
  it("produces no conflict or optional-to-standard projection", () => { expect(assertionRecords.filter((item) => item.conflictState === "CONFLICTING")).toEqual([]); expect(assertionRecords.filter((item) => item.availabilityStatus === "STANDARD" || item.availabilityStatus === "NOT_AVAILABLE")).toEqual([]); });
  it("does not bypass independent review", () => { expect(reviewEvents).toEqual([]); expect(JSON.stringify(reviewEvents)).not.toMatch(/SECOND_REVIEW_PASSED|APPROVED/u); });
  it("moves only batch to second review while pilot remains collecting", () => { expect(batchLifecycle).toMatchObject({ lifecycleState: "SECOND_REVIEW_REQUIRED", collectorInstanceId: "ACTOR-COLLECTOR-CODEX-CATALOG-001", completedAt: null }); expect(pilotLifecycle).toMatchObject({ lifecycleState: "COLLECTING", completedAt: null }); });
  it("matches the deterministic working-artifact checksum manifest", () => { const root = "data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001"; for (const [name, expected] of Object.entries(checksums)) expect(sha(readFileSync(`${root}/${name}`))).toBe(expected); });
});
