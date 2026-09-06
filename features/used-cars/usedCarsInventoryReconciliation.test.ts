import {describe,expect,it} from "vitest";
import {reconcileInventorySnapshot} from "./inventory/reconciliation";
const existing=[{externalStockId:"A",tenantId:"t1",branchId:"b1",currentFingerprint:"h1",currentStatus:"ACTIVE" as const},{externalStockId:"B",tenantId:"t1",branchId:"b1",currentFingerprint:"h2",currentStatus:"ACTIVE" as const}];
describe("inventory snapshot reconciliation",()=>{
 it("separates create, update, unchanged and explicit closure",()=>expect(reconcileInventorySnapshot({tenantId:"t1",branchId:"b1",existing,incoming:[{externalStockId:"A",tenantId:"t1",branchId:"b1",rowFingerprint:"h1",explicitStatus:"ACTIVE"},{externalStockId:"C",tenantId:"t1",branchId:"b1",rowFingerprint:"h3",explicitStatus:"ACTIVE"}]})).toMatchObject({creates:["C"],unchanged:["A"],omittedButUntouched:["B"],writeAuthorized:false}));
 it("never deletes stock merely because it is omitted",()=>expect(reconcileInventorySnapshot({tenantId:"t1",branchId:"b1",existing,incoming:[]}).omittedButUntouched).toEqual(["A","B"]));
 it("ignores cross-tenant rows instead of reconciling them",()=>expect(reconcileInventorySnapshot({tenantId:"t1",branchId:"b1",existing,incoming:[{externalStockId:"X",tenantId:"t2",branchId:"b1",rowFingerprint:"h",explicitStatus:"ACTIVE"}]}).creates).toEqual([]));
});
