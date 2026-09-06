import {describe,expect,it} from "vitest";
import {createCommercialAnalyticsEvent,validateSponsoredCampaign,type SponsoredCampaign} from "./memberships/sponsorship";
const campaign:SponsoredCampaign={campaignId:"c1",tenantId:"t1",listingIds:["l1"],startsAt:"2026-09-01",endsAt:"2026-10-01",label:"SPONSORED",placementSurface:"SPONSORED_CAROUSEL",organicScoreOverrideAllowed:false,verifiedBadgeIncluded:false,active:true};
describe("sponsorship separation",()=>{
 it("accepts an explicitly labelled separate placement",()=>expect(validateSponsoredCampaign(campaign)).toEqual([]));
 it("forbids organic overrides and verified badges",()=>{expect(campaign.organicScoreOverrideAllowed).toBe(false);expect(campaign.verifiedBadgeIncluded).toBe(false);});
 it("keeps sponsored analytics out of organic rank events",()=>expect(createCommercialAnalyticsEvent({campaignId:"c1",placementSurface:"SPONSORED_CAROUSEL",event:"IMPRESSION"})).toMatchObject({stream:"SPONSORED",organicRankPosition:null}));
});
