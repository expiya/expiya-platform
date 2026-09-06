import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { APPLIANCES_PORTFOLIO_AUTHORITY_ID, APPLIANCES_PORTFOLIO_DIGEST, ACTIVE_APPLIANCES_CATEGORY_IDS, INACTIVE_APPLIANCES_CATEGORY_IDS } from "./categoryRegistry";

export async function validateAppliancesPortfolioAuthority(root: string): Promise<{ status: "VALID" } | { status: "FAILED_CLOSED"; reason: string }> {
  try {
    const file = path.join(root, "data/governance/appliances/new-category-portfolio/releases/APPLIANCES-NEW-CATEGORY-PORTFOLIO-TR-v0.1/portfolio.json");
    const document = JSON.parse(await readFile(file, "utf8")) as { payloadDigest: string; payload: { authorityId: string; runtimeActive: boolean; categories: { categoryId: string }[] } };
    const digest = `sha256:${createHash("sha256").update(JSON.stringify(document.payload)).digest("hex")}`;
    const ids = document.payload.categories.map(item => item.categoryId);
    const implemented = new Set<string>([...ACTIVE_APPLIANCES_CATEGORY_IDS, ...INACTIVE_APPLIANCES_CATEGORY_IDS]);
    if (document.payloadDigest !== APPLIANCES_PORTFOLIO_DIGEST || digest !== APPLIANCES_PORTFOLIO_DIGEST || document.payload.authorityId !== APPLIANCES_PORTFOLIO_AUTHORITY_ID || document.payload.runtimeActive !== false || ids.length !== 18 || ids.some(id => !implemented.has(id))) throw new Error("MISMATCH");
    return { status: "VALID" };
  } catch { return { status: "FAILED_CLOSED", reason: "APPLIANCES_PORTFOLIO_AUTHORITY_INVALID" }; }
}
