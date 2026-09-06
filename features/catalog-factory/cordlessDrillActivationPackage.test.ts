import artifact from "../../outputs/cordless-drill-real-wave-01/activation-package.json";
import { describe,expect,it } from "vitest";
import { canonicalDigest } from "./canonical";
import { buildCordlessDrillActivationPackage, CORDLESS_DRILL_FACTORY_DIGEST } from "./cordlessDrillActivationPackage";

describe("Cordless Drill activation package",()=>{
  it("is deterministic, digest-bound and owner-approval-ready",()=>{const generated=buildCordlessDrillActivationPackage();expect(generated).toEqual(artifact);const {packageDigest,...payload}=artifact;expect(packageDigest).toBe(canonicalDigest(payload));expect(generated.factoryDigest).toBe(CORDLESS_DRILL_FACTORY_DIGEST);expect(generated.membershipProof).toMatchObject({exactProductCount:16,unknownCount:4,rejectedCount:0,silentDropCount:0});});
  it("preserves authority and inactive boundaries",()=>{const row=buildCordlessDrillActivationPackage();expect(row.authorityBoundaries).toMatchObject({amazon:"COMMERCE_DISCOVERY_ONLY_ACCESS_GAP_PRESERVED",unknown:"NEUTRAL",persona:{waveScoreCap:0.6,universalAggregateCap:0.75,winnerAuthority:false},decision:{ties:"PRESERVE_NON_DOMINATED_SET",softOnlyWinner:false}});expect(row.atomicActivationPlan).toMatchObject({mode:"COMPARE_AND_SWAP",expectedActivePointer:"ABSENT",activePointerWrite:false,runtimeWrite:false,deployment:false});});
});
