import active from "@/data/production/cordless-drill/active.json";
import event from "@/data/production/cordless-drill/releases/CORDLESS-DRILL-TR-v1.0-2026-09-07/activation-event.json";
import { describe,expect,it } from "vitest";
import { resolveDepartmentCapability } from "@/features/platform/departmentRegistry";
import { descriptorForCategory } from "@/features/platform/secretaryRoutingPack";
import { requireXpyDomainPack } from "@/features/xpy/domainPacks";
import { requireXpyStageOneAdapter } from "@/features/xpy/stageOneAdapterRegistry";
import { CORDLESS_DRILL_PRODUCTS,CORDLESS_DRILL_SECRETARY_IDENTITIES } from "./catalog";
describe("Cordless Drill atomic activation",()=>{it("binds exact approved digests and membership",()=>{expect(active.packageDigest).toBe(event.packageDigest);expect(event).toMatchObject({compareAndSwap:true,exactProductCount:16,unknownCount:4,databaseMigration:false,deployed:false});expect(CORDLESS_DRILL_PRODUCTS).toHaveLength(16);expect(CORDLESS_DRILL_SECRETARY_IDENTITIES).toHaveLength(16)});it("activates only production-baseline Stage 1 surfaces",()=>{expect(resolveDepartmentCapability("TOOLS","CORDLESS_DRILL")?.status).toBe("ACTIVE");expect(descriptorForCategory("CORDLESS_DRILL")?.departmentId).toBe("TOOLS");expect(requireXpyDomainPack("TOOLS").categories).toContain("CORDLESS_DRILL");expect(requireXpyStageOneAdapter("TOOLS","CORDLESS_DRILL")).toBe("cordless-drill-stage1-presentation/v1")});});
