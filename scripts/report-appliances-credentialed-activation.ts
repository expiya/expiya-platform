import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { inventoryCredentialReferences } from "../features/appliances/commerce/credentialedActivation";

const root = process.cwd();
const current = JSON.parse(readFileSync(path.join(root, "data/production/appliances/commerce/current.json"), "utf8")) as { snapshotFile: string };
const snapshot = JSON.parse(readFileSync(path.join(root, "data/production/appliances/commerce", current.snapshotFile), "utf8")) as { productScope: { categoryId: string; exactProductId: string }[]; offers: { exactProductId: string; expiresAt: string }[]; media: { exactProductId: string; status: string }[]; snapshotDigest: string };
const inventory = inventoryCredentialReferences(process.env);
const now = new Date();
const freshOffers = snapshot.offers.filter(item => Date.parse(item.expiresAt) > now.getTime());
const reportCore = {
  schemaVersion: "appliances-credentialed-activation-report/v1",
  workUnit: "WU-XPY-APPL-CREDENTIALED-COMMERCE-MEDIA-ACTIVATION-01",
  generatedAt: now.toISOString(),
  verdict: inventory.some(item => item.status === "READY") ? "PARTIAL_CONFIGURATION_REQUIRES_PROVIDER_VALIDATION" : "BLOCKED_EXTERNAL",
  credentialInventory: inventory,
  authorityInventory: { explicitMediaRightsDeclarations: inventory.filter(item => item.mediaRightsDeclarationPresent).map(item => item.provider), secretValuesPersisted: false },
  exactScope: { categoryCount: new Set(snapshot.productScope.map(item => item.categoryId)).size, productCount: snapshot.productScope.length, registrySnapshotDigest: snapshot.snapshotDigest },
  activatedCoverage: { freshExactOfferCount: freshOffers.length, productsWithFreshOffers: new Set(freshOffers.map(item => item.exactProductId)).size, exactApprovedMediaCount: snapshot.media.filter(item => item.status === "EXACT_APPROVED").length },
  boundaries: { technicalCatalogBlocked: false, unknownPriceState: "BUDGET_ELIGIBILITY_UNKNOWN", affiliateRankingEffect: "NONE", akakceRole: "DISCOVERY_ONLY", secretsLogged: false, retriesMaximum: 3, rateLimitBypass: false },
  prerequisites: ["Issue least-privilege provider credentials and document account/feed eligibility.", "Provide provider endpoint/schema documentation and a sandbox or approved feed sample.", "Provide an explicit media grant stating exact-product applicability and CACHE_LOCAL or REMOTE_DISPLAY permission.", "Provide canonical seller identity, TRY price, availability and timestamp fields.", "Configure credential values only in the deployment secret store under the reported references."],
  nextWorkUnit: "WU-XPY-APPL-PRODUCTION-HANDOFF-KEY-AND-ENTITLEMENT-FOUNDATION-01",
};
const digest = createHash("sha256").update(JSON.stringify(reportCore)).digest("hex");
const output = path.join(root, "data/production/appliances/commerce/credentialed-activation-report.json");
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({ ...reportCore, reportDigest: digest }, null, 2)}\n`);
console.log(JSON.stringify({ verdict: reportCore.verdict, providersReady: inventory.filter(item => item.status === "READY").length, categoryCount: reportCore.exactScope.categoryCount, productCount: reportCore.exactScope.productCount, freshExactOfferCount: freshOffers.length, exactApprovedMediaCount: reportCore.activatedCoverage.exactApprovedMediaCount, reportDigest: digest }));
