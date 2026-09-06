import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "data/production/personas/universal/external-evidence/XPY-UNIVERSAL-PERSONA-EXTERNAL-EVIDENCE-01");
const read = <T>(name: string): T => JSON.parse(readFileSync(path.join(root, name), "utf8")) as T;

describe("universal Persona external-evidence checkpoint", () => {
  it("reconciles every frozen exact product without a silent drop", () => {
    const rows = read<Array<{ exactProductId:string; terminalStatus:string; personalDataStored:boolean }>>("acquisition-ledger.json");
    const reconciliation = read<{ foundationDigest:string; processed:number; expected:number; noSilentDrop:boolean; qualified:number; unknown:number }>("reconciliation.json");
    expect(reconciliation.foundationDigest).toBe("sha256:e9878272ea714c509334c0d56bdfd7b08c7af03471d1a18cfb80431ea4dfe961");
    expect({ processed:rows.length, unique:new Set(rows.map(row=>row.exactProductId)).size }).toEqual({ processed:169, unique:169 });
    expect(reconciliation).toMatchObject({ processed:169, expected:169, noSilentDrop:true, qualified:0, unknown:169 });
    expect(rows.every(row=>row.terminalStatus==="PERSONA_EVIDENCE_UNKNOWN"&&!row.personalDataStored)).toBe(true);
  });

  it("holds foreign evidence instead of weakening exact-identity thresholds", () => {
    const sources = read<Array<{ sourceId:string; productIdentityMatch:string; limitations:string[]; commercialRelationship:string }>>("external-source-registry.json");
    const claims = read<Array<{ status:string; contribution:number; sourceIds:string[] }>>("proposed-claims-held.json");
    expect(sources).toHaveLength(4);
    expect(sources.every(source=>source.productIdentityMatch.includes("TR SUFFIX NOT")||source.productIdentityMatch.includes("EXACT TR SKU/COLOR NOT"))).toBe(true);
    expect(sources.every(source=>source.limitations.length>0&&source.commercialRelationship.length>0)).toBe(true);
    expect(claims.every(claim=>claim.status==="HELD_IDENTITY_LIMIT"&&claim.contribution===0&&claim.sourceIds.length>=2)).toBe(true);
  });

  it("keeps membership, unknown neutrality, ties and catalog-order independence in every requested preview", () => {
    const traces = read<Array<{ categoryId:string; membershipIdentical:boolean; unknownNeutral:boolean; tiesPreserved:boolean; catalogOrderIndependent:boolean; personaSelectionAuthority:boolean; cap:number }>>("trace-previews.json");
    expect(traces.map(row=>row.categoryId)).toEqual(["LAPTOP","SMARTPHONE","WASHING_MACHINE","REFRIGERATOR","FULLY_AUTOMATIC_ESPRESSO_MACHINE","HEADPHONES","STROLLER"]);
    expect(traces.every(row=>row.membershipIdentical&&row.unknownNeutral&&row.tiesPreserved&&row.catalogOrderIndependent&&!row.personaSelectionAuthority&&row.cap===.75)).toBe(true);
  });
});
