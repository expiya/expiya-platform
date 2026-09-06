import {existsSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
import {usedCarsB2cSmokeRoutes,usedCarsPartnerDemoSmokeRoutes,usedCarsUiSmokeExpectations} from "./readiness/uiSmokeManifest";
const routeFile=(route:string)=>route.replace(/^\/ikinciel\/?/u,"").replace("arac/demo-ankara-suv-01","arac/[id]");
describe("used-cars UI smoke manifest",()=>{
 it("maps every declared route to an App Router page",()=>{for(const route of [...usedCarsB2cSmokeRoutes,...usedCarsPartnerDemoSmokeRoutes])expect(existsSync(join(process.cwd(),"app/ikinciel",routeFile(route),"page.tsx"))).toBe(true);});
 it("covers all partner demo pages",()=>expect(usedCarsPartnerDemoSmokeRoutes).toHaveLength(14));
 it("keeps partner and production UI safety expectations explicit",()=>expect(usedCarsUiSmokeExpectations).toMatchObject({partnerRobots:"noindex, nofollow, nocache",partnerProductionAuth:"disabled",productionUiLaunchAuthorized:false}));
});
