export interface DemoDemandBucket { readonly label: string; readonly demand: number; readonly stock: number }
export const DEMO_DEMAND_BUCKETS: readonly DemoDemandBucket[] = Object.freeze([
  { label: "2021+ · ≤70 bin km", demand: 82, stock: 46 },
  { label: "2018+ · ≤110 bin km", demand: 67, stock: 74 },
  { label: "SUV · Hibrit", demand: 91, stock: 32 },
  { label: "Hatchback · Benzin", demand: 58, stock: 69 },
]);
export const DEMO_FUNNEL = Object.freeze({ organicImpressions: 1240, detailOpens: 386, consentedLeads: 42, contacted: 35 });
export const DEMO_ANALYTICS_CONTRACT = Object.freeze({ namespace: "used_partner", containsPii: false, containsPlanCode: false, sponsoredMixed: false });

