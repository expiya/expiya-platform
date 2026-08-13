export interface VehicleListingAnalysis {
  readonly sourceUrl: string;
  readonly sourceHost: string;
  readonly title: string;
  readonly vehicle: {
    readonly brand?: string;
    readonly model?: string;
    readonly year?: number;
    readonly price?: number;
    readonly currency?: string;
    readonly km?: number;
    readonly fuel?: string;
    readonly transmission?: string;
    readonly location?: string;
    readonly seller?: string;
  };
  readonly userFit: "STRONG" | "PARTIAL" | "WEAK" | "UNCLEAR";
  readonly summary: string;
  readonly matches: readonly string[];
  readonly mismatches: readonly string[];
  readonly missingInformation: readonly string[];
  readonly sellerQuestions: readonly string[];
  readonly disclaimer: string;
}
