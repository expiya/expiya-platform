import preparation from "../../outputs/cordless-drill-real-wave-01/owner-review-activation-preparation.json";
import summary from "../../outputs/cordless-drill-real-wave-01/summary.json";
import { describe, expect, it } from "vitest";

describe("Cordless Drill owner-review activation preparation",()=>{
  it("binds the exact immutable candidate without granting production authority",()=>{
    expect(preparation.factoryDigest).toBe(summary.factoryDigest);
    expect(preparation.candidateCommit).toBe("71bdd10a20d9763635f2ac3568bd5395923ac11a");
    expect(preparation).toMatchObject({immutable:true,activationAuthorityGranted:false,activePointerWrite:false,databaseMigration:false,productionRuntimeWrite:false,deployment:false});
  });
});
