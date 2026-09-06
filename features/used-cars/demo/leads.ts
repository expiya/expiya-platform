export type DemoLeadPurpose = "CONTACT" | "TEST_DRIVE" | "PRICE_QUOTE";
export interface DemoLeadSummary {
  readonly id: string; readonly purpose: DemoLeadPurpose; readonly vehicle: string;
  readonly customerMasked: string; readonly phoneMasked: string; readonly createdAt: string;
  readonly consentScope: string; readonly status: "NEW" | "CONTACTED" | "CLOSED";
}
export const DEMO_LEADS: readonly DemoLeadSummary[] = Object.freeze([
  { id: "demo-lead-301", purpose: "TEST_DRIVE", vehicle: "Demo C-HR · STK-1042", customerMasked: "S••• A•••", phoneMasked: "05•• ••• •• 18", createdAt: "Bugün 14:32", consentScope: "Yalnız test sürüşü koordinasyonu", status: "NEW" },
  { id: "demo-lead-298", purpose: "PRICE_QUOTE", vehicle: "Demo Clio · STK-1038", customerMasked: "E••• K•••", phoneMasked: "05•• ••• •• 42", createdAt: "Bugün 11:08", consentScope: "Yalnız fiyat teklifi", status: "CONTACTED" },
]);

