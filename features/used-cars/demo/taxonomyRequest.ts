export interface DemoTaxonomyIdentityRequest {
  readonly id: string;
  readonly market: "TR";
  readonly sellerSuppliedLabel: string;
  readonly approximatePeriod: string;
  readonly evidenceTypes: readonly string[];
  readonly status: "SUBMITTED" | "EVIDENCE_REVIEW";
  readonly sellerCanCreateCanonicalIdentity: false;
}

export const DEMO_IDENTITY_REQUEST: DemoTaxonomyIdentityRequest = Object.freeze({
  id: "demo-taxreq-017", market: "TR", sellerSuppliedLabel: "1970'ler özel ithalat coupe",
  approximatePeriod: "1972–1976 (satıcı tahmini)", evidenceTypes: ["Ruhsat kopyası", "Şasi etiketi fotoğrafı", "Dönem broşürü referansı"],
  status: "EVIDENCE_REVIEW", sellerCanCreateCanonicalIdentity: false,
});

