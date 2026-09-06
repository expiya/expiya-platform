import type { GradingResult } from "promptfoo";

export default function deterministicV3Assertion(output: string): GradingResult {
  try {
    const report = JSON.parse(output) as { assertions?: readonly { name: string; pass: boolean; reason: string }[] };
    const assertions = report.assertions ?? [];
    const failed = assertions.filter((item) => !item.pass);
    return {
      pass: assertions.length > 0 && failed.length === 0,
      score: assertions.length > 0 ? (assertions.length - failed.length) / assertions.length : 0,
      reason: failed.length ? failed.map((item) => `${item.name}: ${item.reason}`).join(" | ") : `${assertions.length} deterministik kontrol geçti.`,
      componentResults: assertions.map((item) => ({ pass: item.pass, score: item.pass ? 1 : 0, reason: `${item.name}: ${item.reason}` })),
    };
  } catch (error) {
    return { pass: false, score: 0, reason: `Provider çıktısı okunamadı: ${error instanceof Error ? error.message : String(error)}` };
  }
}
