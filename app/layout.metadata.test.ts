import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8");
const verificationName = "mitgo-verification";
const verificationToken = "c85c3626-d14a-4c81-b18c-73b6d03cfb70";

describe("root layout metadata", () => {
  it("declares the public Mitgo verification value exactly once through metadata.other", () => {
    expect(source).toContain("other: {");
    expect(source.match(new RegExp(verificationName, "gu"))).toHaveLength(1);
    expect(source.match(new RegExp(verificationToken, "gu"))).toHaveLength(1);
  });

  it("preserves the existing site title and description", () => {
    expect(source).toContain('title: "Expiya — Satın Alma Karar Platformu"');
    expect(source).toContain(
      '"Expiya, otomobil ve ev ürünleri kararlarını ihtiyaçlarınıza göre birlikte netleştirmenize yardımcı olur."',
    );
  });
});
