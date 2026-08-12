export interface ConsumerExperienceEvidence {
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly market: "ABD";
  readonly complaintCount: number;
  readonly recurringRiskThemes: readonly string[];
  readonly limitation: string;
}
