import { z } from "zod";

export const STRICT_RFC3339_TIMESTAMP_POLICY_VERSION = "STRICT_RFC3339_OFFSET_V1";
export const STRICT_RFC3339_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|([+-])(\d{2}):(\d{2}))$/u;

export function parseStrictRfc3339Instant(value: string): number | undefined {
  const match = STRICT_RFC3339_TIMESTAMP_PATTERN.exec(value);
  if (!match) return undefined;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, millisText, zone, sign, offsetHourText, offsetMinuteText] = match;
  const [year, month, day, hour, minute, second, millis] = [yearText, monthText, dayText, hourText, minuteText, secondText, millisText ?? "0"].map(Number);
  const offsetHour = zone === "Z" ? 0 : Number(offsetHourText);
  const offsetMinute = zone === "Z" ? 0 : Number(offsetMinuteText);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59 || millis > 999 || offsetHour > 23 || offsetMinute > 59) return undefined;
  const localUtc = Date.UTC(year, month - 1, day, hour, minute, second, millis);
  const local = new Date(localUtc);
  if (local.getUTCFullYear() !== year || local.getUTCMonth() !== month - 1 || local.getUTCDate() !== day || local.getUTCHours() !== hour || local.getUTCMinutes() !== minute || local.getUTCSeconds() !== second || local.getUTCMilliseconds() !== millis) return undefined;
  const direction = sign === "-" ? -1 : 1;
  const instant = localUtc - direction * (offsetHour * 60 + offsetMinute) * 60_000;
  return Number.isFinite(instant) ? instant : undefined;
}

export function isStrictRfc3339Timestamp(value: string): boolean {
  return parseStrictRfc3339Instant(value) !== undefined;
}

export const strictRfc3339TimestampSchema = z.string().refine(isStrictRfc3339Timestamp, "Invalid strict RFC 3339 timestamp with required offset.");

export function validateCatalogTemporalInvariant(input: { stagingAt: string; approvalAt: string; effectiveAt: string; activatedAt: string; evaluationAt: string }): readonly string[] {
  const values = [input.stagingAt, input.approvalAt, input.effectiveAt, input.activatedAt, input.evaluationAt].map(parseStrictRfc3339Instant);
  if (values.some((value) => value === undefined)) return ["TEMPORAL_TIMESTAMP_INVALID"];
  const [staging, approval, effective, activated, evaluation] = values as number[];
  return staging <= approval && approval <= effective && effective <= activated && activated <= evaluation ? [] : ["TEMPORAL_INVARIANT_VIOLATION"];
}
