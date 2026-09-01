import {describe,expect,it} from "vitest";
import {mapFeedRow,validateFeedMapping,type FeedColumnMapping} from "./inventory/feedMapping";
const mappings:readonly FeedColumnMapping[]=[{sourceColumn:"stock",targetColumn:"externalStockId",transform:"TRIM"},{sourceColumn:"taxonomy",targetColumn:"taxonomyVariantId",transform:"TRIM"},{sourceColumn:"year",targetColumn:"modelYear",transform:"INTEGER"},{sourceColumn:"km",targetColumn:"mileageKm",transform:"INTEGER"},{sourceColumn:"price",targetColumn:"askingPriceTry",transform:"INTEGER"},{sourceColumn:"vin",targetColumn:"vin",transform:"UPPERCASE"},{sourceColumn:"status",targetColumn:"stockStatus",transform:"CONTROLLED_ENUM"},{sourceColumn:"branch",targetColumn:"branchExternalId",transform:"TRIM"}];
describe("feed column mapping",()=>{
 it("requires canonical identity, branch, stock and price columns",()=>expect(validateFeedMapping(mappings)).toEqual([]));
 it("maps deterministic transforms without free-text identity creation",()=>expect(mapFeedRow({row:{stock:" S1 ",taxonomy:"uct_trim_x",year:"2022",km:"40000",price:"1000000",vin:"wvwzzz1jzxw000001",status:"active",branch:"B1"},mappings})).toMatchObject({errors:[],mapped:{externalStockId:"S1",taxonomyVariantId:"uct_trim_x",modelYear:2022,stockStatus:"ACTIVE"}}));
 it("reports transform errors per source column",()=>expect(mapFeedRow({row:{stock:"S1",taxonomy:"t",year:"bad",km:1,price:1,vin:"v",status:"active",branch:"b"},mappings}).errors).toContain("TRANSFORM_FAILED:year:INTEGER"));
});
