export interface DemoImportRow {
  readonly row: number; readonly stockNumber: string; readonly taxonomyId: string;
  readonly vinMasked: string; readonly status: "ACCEPTED" | "REJECTED" | "DUPLICATE_IN_BATCH";
  readonly messages: readonly string[];
}

export const DEMO_IMPORT_ROWS: readonly DemoImportRow[] = Object.freeze([
  { row: 2, stockNumber: "STK-1101", taxonomyId: "model-chr", vinMasked: "NMT•••••1101", status: "ACCEPTED", messages: [] },
  { row: 3, stockNumber: "STK-1102", taxonomyId: "model-clio", vinMasked: "VF1•••••1102", status: "ACCEPTED", messages: [] },
  { row: 4, stockNumber: "STK-1103", taxonomyId: "—", vinMasked: "WVW•••••1103", status: "REJECTED", messages: ["TAXONOMY_ID_NOT_FOUND", "MODEL_YEAR_REQUIRED"] },
  { row: 5, stockNumber: "STK-1104", taxonomyId: "model-chr", vinMasked: "NMT•••••1101", status: "DUPLICATE_IN_BATCH", messages: ["VIN_DUPLICATE_IN_BATCH"] },
]);

export const summarizeDemoImport = (rows: readonly DemoImportRow[]) => ({
  accepted: rows.filter(row => row.status === "ACCEPTED").length,
  rejected: rows.filter(row => row.status !== "ACCEPTED").length,
  writeAuthorized: false as const,
});

