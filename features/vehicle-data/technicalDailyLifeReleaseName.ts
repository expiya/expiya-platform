export const TECHNICAL_DAILY_LIFE_RELEASE_PATTERN = /^v\d+\.\d+(?:\.\d+)?-\d+\.\d+\.\d+-\d{4}-\d{2}-\d{2}(?:-compatibility-rebind)?$/u;

export function assertTechnicalDailyLifeReleaseName(value: string): void {
  if (!TECHNICAL_DAILY_LIFE_RELEASE_PATTERN.test(value)) throw new TypeError("Invalid technical daily-life release name.");
}
