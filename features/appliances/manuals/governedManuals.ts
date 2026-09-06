import { createHash } from "node:crypto";

export const APPLIANCES_MANUAL_SCHEMA = "appliances-governed-manual-release/v1" as const;
export const OFFICIAL_MANUAL_HOSTS = new Set([
  "download.arcelik.com.tr", "www.arcelik.com.tr", "gsim2hwnpbvwtwmb1dg11z6.blob.core.windows.net",
  "media3.bosch-home.com", "media3.bsh-group.com", "statik.vestel.com.tr", "destek.arzum.com.tr", "www.delonghi.com",
  "dam.versuni.com", "www.baymak.com.tr",
]);

export type ManualLocator = { readonly page: number; readonly section: string };
export type ManualInventoryMember = { readonly categoryId: string; readonly productId: string; readonly brand: string; readonly model: string; readonly configurationIdentity: string; readonly parentRelease: string; readonly parentArtifactSha256: string; readonly discoveredManuals: readonly { sourceId: string; url: string; kind: "DIRECT_PDF" | "SUPPORT_INDEX" }[] };
export type GovernedManual = { readonly manualId: string; readonly sourceId: string; readonly sourceUrl: string; readonly retrievedAt: string; readonly contentType: string; readonly byteLength: number; readonly artifactSha256: `sha256:${string}`; readonly textArtifactSha256: `sha256:${string}`; readonly categoryId: string; readonly productId: string; readonly exactProductCode: string; readonly identityLocator: ManualLocator; readonly pageCount: number; readonly language: string; readonly immutableBytesPath: string; readonly immutableTextPath: string };
export type L9Knowledge = { readonly knowledgeId: string; readonly manualId: string; readonly categoryId: string; readonly productId: string; readonly statement: string; readonly locator: ManualLocator; readonly knowledgeKind: "SAFETY" | "INSTALLATION" | "MAINTENANCE" | "USAGE" | "LIMITATION"; readonly decisionAuthority: "NONE"; readonly candidateEffect: "NONE"; readonly professionalInstallationRequired: boolean; readonly publicSourceDisclosure: string };
export type ManualBlockerCode = "NO_MANUAL_IDENTIFIER" | "SUPPORT_INDEX_DYNAMIC" | "DOWNLOAD_FAILED" | "NON_PDF_RESPONSE" | "NON_EXTRACTABLE" | "IDENTITY_MISMATCH" | "WRONG_MARKET" | "DUPLICATE_BYTES_DIFFERENT_IDENTITY";
export type ManualBlocker = { readonly categoryId: string; readonly productId: string; readonly sourceUrl?: string; readonly code: ManualBlockerCode; readonly retryable: boolean; readonly detail: string };
export type GovernedManualRelease = { readonly schemaVersion: typeof APPLIANCES_MANUAL_SCHEMA; readonly releaseId: string; readonly generatedAt: string; readonly lifecycle: "FROZEN_READ_ONLY"; readonly authority: "L9_ADVISOR_ONLY"; readonly parentPolicy: "IMMUTABLE_NO_OVERWRITE"; readonly inventoryDigest: `sha256:${string}`; readonly members: readonly ManualInventoryMember[]; readonly manuals: readonly GovernedManual[]; readonly l9AdvisorKnowledge: readonly L9Knowledge[]; readonly blockers: readonly ManualBlocker[]; readonly boundaries: { readonly candidateEligibility: "NONE"; readonly scoring: "NONE"; readonly sufficiency: "NONE"; readonly recommendation: "NONE"; readonly y: "NONE"; readonly absenceTreatment: "NEUTRAL"; readonly crossProductPromotion: "FORBIDDEN" }; readonly releaseDigest: `sha256:${string}` };

export const sha256 = (value: string | Uint8Array): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
export const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const identity = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toUpperCase().replace(/[^A-Z0-9]/gu, "");

export function validateOfficialManualUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || !OFFICIAL_MANUAL_HOSTS.has(url.hostname)) throw new TypeError("MANUAL_SOURCE_NOT_OFFICIAL");
  return url;
}

export function splitExtractedPages(text: string): readonly string[] { return text.replace(/\r\n?/gu, "\n").split("\f").filter((page, index, all) => page.trim() || index < all.length - 1); }
export function proveExactIdentity(pages: readonly string[], exactProductCode: string): ManualLocator | undefined {
  const needle = identity(exactProductCode); if (!needle) return undefined;
  const index = pages.findIndex(page => identity(page).includes(needle));
  if (index < 0) return undefined;
  const heading = pages[index].split("\n").map(x => x.trim()).find(x => x.length >= 3 && x.length <= 100 && identity(x).includes(needle)) ?? "Model identity";
  return { page: index + 1, section: heading };
}

export function validateLocator(pages: readonly string[], locator: ManualLocator): boolean {
  return Number.isInteger(locator.page) && locator.page > 0 && locator.page <= pages.length && locator.section.trim().length > 0 && identity(pages[locator.page - 1]).includes(identity(locator.section));
}

export function finalizeRelease(unsigned: Omit<GovernedManualRelease, "releaseDigest">): GovernedManualRelease {
  return Object.freeze({ ...unsigned, releaseDigest: sha256(stableJson(unsigned)) });
}

export function validateRelease(release: GovernedManualRelease, bytesByPath?: ReadonlyMap<string, Uint8Array>, textByPath?: ReadonlyMap<string, string>): readonly string[] {
  const issues: string[] = [];
  const { releaseDigest: _digest, ...unsigned } = release;
  void _digest;
  if (release.schemaVersion !== APPLIANCES_MANUAL_SCHEMA || release.releaseDigest !== sha256(stableJson(unsigned))) issues.push("RELEASE_DIGEST_MISMATCH");
  if (release.inventoryDigest !== sha256(stableJson(release.members))) issues.push("INVENTORY_DIGEST_MISMATCH");
  if (release.authority !== "L9_ADVISOR_ONLY" || Object.values(release.boundaries).some((v, i) => i < 5 && v !== "NONE")) issues.push("DECISION_AUTHORITY_LEAKAGE");
  const members = new Set(release.members.map(x => `${x.categoryId}|${x.productId}`));
  const manuals = new Map(release.manuals.map(x => [x.manualId, x]));
  const digestOwner = new Map<string, string>();
  for (const manual of release.manuals) {
    if (!members.has(`${manual.categoryId}|${manual.productId}`)) issues.push("MANUAL_MEMBER_MISMATCH");
    const owner = digestOwner.get(manual.artifactSha256); if (owner && owner !== manual.productId) issues.push("DUPLICATE_BYTES_DIFFERENT_IDENTITY"); else digestOwner.set(manual.artifactSha256, manual.productId);
    const bytes = bytesByPath?.get(manual.immutableBytesPath); if (bytes && sha256(bytes) !== manual.artifactSha256) issues.push("MANUAL_DIGEST_MISMATCH");
    const text = textByPath?.get(manual.immutableTextPath); if (text && (sha256(text) !== manual.textArtifactSha256 || !validateLocator(splitExtractedPages(text), manual.identityLocator))) issues.push("TEXT_OR_IDENTITY_LOCATOR_INVALID");
  }
  for (const entry of release.l9AdvisorKnowledge) { const manual = manuals.get(entry.manualId), text = manual ? textByPath?.get(manual.immutableTextPath) : undefined; if (!manual || manual.productId !== entry.productId || manual.categoryId !== entry.categoryId || !members.has(`${entry.categoryId}|${entry.productId}`) || entry.decisionAuthority !== "NONE" || entry.candidateEffect !== "NONE") issues.push("L9_ISOLATION_INVALID"); if (text && !validateLocator(splitExtractedPages(text), entry.locator)) issues.push("L9_LOCATOR_INVALID"); }
  return [...new Set(issues)];
}
