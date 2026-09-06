import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { canonicalize } from "@/features/decision/v2/fingerprint/canonicalize";

export const BRAND_POLICY_ID = "APPLIANCES_BRAND_CONSTRAINT_POLICY/v1.0";
const payloadSchema=z.object({schemaVersion:z.literal("appliances-brand-constraint-policy/v1"),policyId:z.literal(BRAND_POLICY_ID),governanceStatus:z.literal("APPROVED"),lifecycle:z.literal("FROZEN"),runtimeActive:z.literal(true),department:z.literal("APPLIANCES"),productTypes:z.tuple([z.literal("WASHING_MACHINE"),z.literal("REFRIGERATOR"),z.literal("DISHWASHER"),z.literal("DRYER"),z.literal("VACUUM"),z.literal("ROBOT_VACUUM")]),market:z.literal("TR"),semantics:z.object({identity:z.literal("EXACT_MANUFACTURER_BRAND"),decisionEffect:z.literal("HARD_FILTER"),scoringEffect:z.literal("NONE"),unknownBrand:z.literal("CLARIFY_WITHOUT_MUTATION"),noMatch:z.literal("EXPLICIT_RELAXATION_REQUIRED"),correction:z.literal("APPEND_ONLY_SUPERSESSION"),clear:z.literal("USER_EXPLICIT")})});
const artifactSchema=z.object({envelopeSchemaVersion:z.literal("appliances-brand-constraint-policy-artifact/v1"),canonicalSerialization:z.literal("CANONICAL_JSON_SORTED_KEYS_V1"),policyDigest:z.string().regex(/^[a-f0-9]{64}$/u),payload:payloadSchema});
const pointerSchema=z.object({schemaVersion:z.literal("appliances-brand-constraint-policy-active-pointer/v1"),policyId:z.literal(BRAND_POLICY_ID),policyDigest:z.string().regex(/^[a-f0-9]{64}$/u),policyFile:z.string(),lifecycle:z.literal("ACTIVE")});
export type BrandConstraintPolicy=z.infer<typeof payloadSchema>;
export const digestBrandConstraintPolicy=(payload:BrandConstraintPolicy)=>createHash("sha256").update(canonicalize(payload)).digest("hex");
export async function loadActiveBrandConstraintPolicy(root:string){try{const base=path.resolve(root,"data/production/appliances/brand-constraint-policy"),pointer=pointerSchema.parse(JSON.parse(await readFile(path.join(base,"active.json"),"utf8"))),file=path.resolve(base,pointer.policyFile);if(!file.startsWith(`${path.resolve(base,"releases")}${path.sep}`))throw new Error("PATH");const artifact=artifactSchema.parse(JSON.parse(await readFile(file,"utf8"))),digest=digestBrandConstraintPolicy(artifact.payload);if(digest!==artifact.policyDigest||digest!==pointer.policyDigest)throw new Error("DIGEST");return{status:"READY" as const,snapshot:Object.freeze({policy:Object.freeze(artifact.payload),policyDigest:digest})};}catch{return{status:"FAILED_CLOSED" as const,reason:"BRAND_POLICY_INVALID" as const};}}
