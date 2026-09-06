import { describe, expect, it } from "vitest";
import { classifySecretaryMessage } from "./upperSecretary";
import { buildSecretaryProductIdentityIndex } from "./secretaryProductIdentityIndex";

const index = buildSecretaryProductIdentityIndex([
  { departmentId:"ELECTRONICS", categoryId:"SMARTPHONE", brand:"Apple", model:"iPhone 16e", exactIdentifiers:["electronics:smartphone:apple:iphone-16e-128-white"] },
  { departmentId:"ELECTRONICS", categoryId:"LAPTOP", brand:"Apple", family:"MacBook Air", model:"MacBook Air 13-inch M4 (2025)" },
  { departmentId:"ELECTRONICS", categoryId:"SMARTPHONE", brand:"Samsung Electronics", family:"Galaxy A", model:"Galaxy A26 5G", exactIdentifiers:["SM-A266BZKCTUR"] },
  { departmentId:"ELECTRONICS", categoryId:"TABLET", brand:"Samsung Electronics", family:"Galaxy Tab", model:"Galaxy Tab S10" },
  { departmentId:"APPLIANCES", categoryId:"BLENDER", brand:"Bosch", family:"VitaPower", model:"VitaPower Serie 4 MMB6172S", exactIdentifiers:["MMB6172S"] },
  { departmentId:"APPLIANCES", categoryId:"DISHWASHER", brand:"Bosch", model:"SMS4IKW62T" },
]);

describe("Secretary governed product identity index", () => {
  it.each([["iPhone","SMARTPHONE"],["iPhone 16e","SMARTPHONE"],["SM-A266BZKCTUR","SMARTPHONE"],["MMB6172S","BLENDER"]] as const)("routes %s", (message, category) => expect(classifySecretaryMessage(message,{productIdentityIndex:index})).toMatchObject({kind:"PROPOSE_NAVIGATION",destination:expect.stringContaining(`category=${category}`)}));
  it("clarifies a multi-category brand from actual governed destinations",()=>expect(classifySecretaryMessage("Apple ürünlerine bakıyorum",{productIdentityIndex:index})).toMatchObject({kind:"CLARIFY_DESTINATION",choices:expect.arrayContaining([expect.objectContaining({destination:expect.stringContaining("SMARTPHONE")}),expect.objectContaining({destination:expect.stringContaining("LAPTOP")})])}));
  it("clarifies Samsung only across its governed destinations",()=>expect(classifySecretaryMessage("Samsung ürünleri",{productIdentityIndex:index})).toMatchObject({kind:"CLARIFY_DESTINATION",choices:expect.arrayContaining([expect.objectContaining({destination:expect.stringContaining("SMARTPHONE")}),expect.objectContaining({destination:expect.stringContaining("TABLET")})])}));
  it("fails closed on conflicting exact identifiers",()=>expect(buildSecretaryProductIdentityIndex([
    {departmentId:"ELECTRONICS",categoryId:"SMARTPHONE",brand:"A",model:"Shared 1"},
    {departmentId:"ELECTRONICS",categoryId:"TABLET",brand:"B",model:"Shared 1"},
  ])).toMatchObject({status:"FAILED_CLOSED",entries:[]}));
  it("preserves correction precedence",()=>expect(classifySecretaryMessage("iPhone değil, MMB6172S arıyorum",{productIdentityIndex:index})).toMatchObject({destination:expect.stringContaining("BLENDER")}));
  it("preserves brand correction precedence",()=>expect(classifySecretaryMessage("Bosch değil Samsung arıyorum",{productIdentityIndex:index})).toMatchObject({kind:"CLARIFY_DESTINATION",choices:expect.not.arrayContaining([expect.objectContaining({destination:expect.stringContaining("APPLIANCES")})])}));
});
