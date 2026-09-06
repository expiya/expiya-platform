export interface DemoTaxonomyOption { readonly id: string; readonly label: string }
export interface DemoTaxonomyPath {
  readonly make: DemoTaxonomyOption;
  readonly model: DemoTaxonomyOption;
  readonly generation: DemoTaxonomyOption;
  readonly powertrain: DemoTaxonomyOption;
  readonly trim: DemoTaxonomyOption;
  readonly version: string;
  readonly confidence: "HIGH" | "MEDIUM";
}

export const DEMO_TAXONOMY_PATHS: readonly DemoTaxonomyPath[] = Object.freeze([
  { make: { id: "make-toyota", label: "Toyota" }, model: { id: "model-chr", label: "C-HR" }, generation: { id: "gen-chr-ax10", label: "AX10 · 2016–2023" }, powertrain: { id: "engine-18-hybrid", label: "1.8 Hybrid · 122 hp" }, trim: { id: "trim-passion", label: "Passion" }, version: "tr-2026.09", confidence: "HIGH" },
  { make: { id: "make-renault", label: "Renault" }, model: { id: "model-clio", label: "Clio" }, generation: { id: "gen-clio-v", label: "V · 2019–" }, powertrain: { id: "engine-10-tce", label: "1.0 TCe · 100 hp" }, trim: { id: "trim-icon", label: "Icon" }, version: "tr-2026.09", confidence: "HIGH" },
]);

