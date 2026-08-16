import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) throw new Error("Usage: import-owner-vehicle-personas <input.txt> <output.json>");

const protectedDots = readFileSync(input, "utf8")
  .replaceAll("BIG.e", "BIG§e")
  .replaceAll("ID.4", "ID§4")
  .replaceAll("ID.7", "ID§7")
  .replaceAll("ID.Buzz", "ID§Buzz");
const headingPattern = /([^.!?]{1,100}):/g;
const headings = [...protectedDots.matchAll(headingPattern)].map((match) => ({
  label: match[1].trim().replaceAll("§", "."),
  start: match.index!,
  contentStart: match.index! + match[0].length,
}));
const records: { brand: string; brandPersona: string; series: { group: string; persona: string }[] }[] = [];
let current: (typeof records)[number] | undefined;
for (let index = 0; index < headings.length; index += 1) {
  const heading = headings[index];
  const content = protectedDots.slice(heading.contentStart, headings[index + 1]?.start ?? protectedDots.length)
    .trim().replaceAll("§", ".");
  if (heading.label.endsWith("Marka Personası")) {
    const rawBrand = heading.label.slice(0, -"Marka Personası".length).trim();
    const brand = rawBrand === "KGM (SsangYong)" ? "KGM"
      : rawBrand === "Land Rover / Range Rover" ? "Land Rover" : rawBrand;
    current = { brand, brandPersona: content, series: [] };
    records.push(current);
  } else if (current) current.series.push({ group: heading.label, persona: content });
}

const payload = {
  schemaVersion: "1.0.0",
  datasetVersion: "2026.08.16-owner-editorial-v1",
  locale: "tr-TR",
  authority: "OWNER_EDITORIAL",
  decisionUse: "SOFT_PREFERENCE_ONLY",
  disclaimer: "Personalar editoryal yorumdur; teknik gerçek veya kullanıcı demografisi değildir. Güvenli, nötr özellik etiketleri karar sıralamasında yalnız yumuşak tercih olarak kullanılabilir.",
  brands: records,
};
writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ brands: records.length, seriesGroups: records.reduce((sum, item) => sum + item.series.length, 0), output }));
