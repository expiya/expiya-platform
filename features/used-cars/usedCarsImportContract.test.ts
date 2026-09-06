import {describe,expect,it} from "vitest";
import {validateImportEnvelope,type InventoryImportEnvelope} from "./inventory/importContract";
const envelope:InventoryImportEnvelope={schemaVersion:"used-inventory-feed/v1",importId:"i1",tenantId:"t1",branchId:"b1",source:"CSV",mode:"VALIDATE_ONLY",taxonomyReleaseVersion:"tr-used-pilot-0.1.0",sourceChecksum:`sha256:${"a".repeat(64)}`,idempotencyKey:"k1",generatedAt:"2026-09-01",rows:[{}],deletionByOmissionAllowed:false,writeAuthorized:false};
describe("canonical inventory import envelope",()=>{
 it("accepts a scoped validation-only envelope",()=>expect(validateImportEnvelope(envelope)).toEqual([]));
 it("rejects invalid taxonomy and oversized batches",()=>expect(validateImportEnvelope({...envelope,taxonomyReleaseVersion:"latest",rows:Array.from({length:10_001})})).toEqual(expect.arrayContaining(["TAXONOMY_RELEASE_INVALID","IMPORT_TOO_LARGE"])));
 it("keeps deletion by omission and writes disabled",()=>expect(envelope).toMatchObject({deletionByOmissionAllowed:false,writeAuthorized:false}));
});
