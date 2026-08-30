import { afterEach, describe, expect, it, vi } from "vitest";
import { DevelopmentPaidComparisonQuoteRepository, resetDevelopmentPaidComparisonQuotesForTests } from "./repository";
import type { ComparisonReportQuote } from "./contracts";

const quote = { id: "quote-1" } as ComparisonReportQuote;

describe("development paid comparison quote repository", () => {
  afterEach(() => { vi.unstubAllEnvs(); resetDevelopmentPaidComparisonQuotesForTests(); });

  it("keeps a local fixture quote without requiring PostgreSQL", async () => {
    const repository = new DevelopmentPaidComparisonQuoteRepository();
    await repository.createQuote(quote);
    expect(repository.find("quote-1")).toBe(quote);
  });

  it("is disabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(new DevelopmentPaidComparisonQuoteRepository().createQuote(quote)).rejects.toThrow("DEVELOPMENT_QUOTE_STORE_DISABLED");
  });
});
