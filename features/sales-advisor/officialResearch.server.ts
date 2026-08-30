import type { VariantContentArtifact } from "./types";

export interface OfficialResearchEvidence {
  readonly sourceLabel: string;
  readonly sourceUrl: string;
  readonly excerpt: string;
}

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/\p{M}+/gu, "").replace(/[^a-z0-9]+/gu, " ").trim();
const researchQuestion = (value: string) => /(?:guncel|kampanya|garanti|bakim|servis|finansman|kredi|faiz|mtv|vergi|kasko|sigorta|stok|teslim)/u.test(normalize(value));

function allowedHosts(): ReadonlySet<string> {
  return new Set((process.env.CARS_PHASE2_OFFICIAL_RESEARCH_HOSTS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function safeSource(url: string, hosts: ReadonlySet<string>): URL | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || !hosts.has(parsed.hostname.toLowerCase())) return undefined;
    return parsed;
  } catch { return undefined; }
}

const stripHtml = (value: string) => value
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
  .replace(/<[^>]+>/gu, " ")
  .replace(/&nbsp;/giu, " ").replace(/&amp;/giu, "&").replace(/&quot;/giu, "\"")
  .replace(/\s+/gu, " ").trim();

function excerptFor(question: string, text: string): string | undefined {
  const terms = normalize(question).split(" ").filter((item) => item.length >= 4);
  const normalized = normalize(text);
  const positions = terms.map((term) => normalized.indexOf(term)).filter((position) => position >= 0);
  if (!positions.length) return undefined;
  const start = Math.max(0, Math.min(...positions) - 180);
  return text.slice(start, start + 520).trim();
}

export async function researchSelectedVehicleOfficialSources(input: { readonly question: string; readonly artifact: VariantContentArtifact; readonly signal?: AbortSignal }): Promise<readonly OfficialResearchEvidence[]> {
  if (process.env.CARS_PHASE2_OFFICIAL_RESEARCH_ENABLED !== "true" || !researchQuestion(input.question)) return [];
  const hosts = allowedHosts();
  if (!hosts.size) return [];
  const sources = [...input.artifact.facts, ...input.artifact.equipment, ...input.artifact.colors]
    .flatMap((item) => item.source ? [item.source] : [])
    .filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index)
    .slice(0, 2);
  const evidence: OfficialResearchEvidence[] = [];
  for (const source of sources) {
    const url = safeSource(source.url, hosts); if (!url || /\.pdf(?:$|\?)/iu.test(url.pathname)) continue;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    const abort = () => controller.abort(); input.signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(url, { headers: { Accept: "text/html,text/plain;q=0.9", "User-Agent": "ExpiyaCars/1.0 official-source-research" }, redirect: "error", cache: "no-store", signal: controller.signal });
      const contentType = response.headers.get("content-type") ?? "";
      const length = Number(response.headers.get("content-length") ?? "0");
      if (!response.ok || !/(?:text\/html|text\/plain)/iu.test(contentType) || length > 256_000) continue;
      const text = stripHtml((await response.text()).slice(0, 256_000));
      const excerpt = excerptFor(input.question, text); if (excerpt) evidence.push({ sourceLabel: source.label, sourceUrl: url.toString(), excerpt });
    } catch { /* Fail closed to the catalog answer. */ }
    finally { clearTimeout(timeout); input.signal?.removeEventListener("abort", abort); }
  }
  return evidence;
}
