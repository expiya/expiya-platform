import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || parts[0] === 169 && parts[1] === 254
    || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31
    || parts[0] === 192 && parts[1] === 168
    || parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

export async function assertPublicListingUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Yalnızca HTTPS ilan bağlantıları destekleniyor.");
  if (url.username || url.password || url.port) throw new Error("Bağlantı güvenli bir genel web adresi olmalı.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("Yerel ağ adresleri desteklenmiyor.");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Özel veya yerel ağ adresleri desteklenmiyor.");
  return url;
}

function readableText(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? "";
  const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)]
    .map((match) => match[1]).join("\n");
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
  return `TITLE: ${title.replace(/<[^>]+>/g, " ")}\nSTRUCTURED DATA: ${jsonLd}\nPAGE TEXT: ${text}`.slice(0, 80_000);
}

export async function readVehicleListingPage(value: string): Promise<{ url: URL; content: string }> {
  let url = await assertPublicListingUrl(value);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "ExpiyaCarsListingReader/0.2", Accept: "text/html,application/xhtml+xml" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new Error("İlan bağlantısı çok fazla yönlendirme içeriyor.");
      url = await assertPublicListingUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`İlan sayfası okunamadı (${response.status}).`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("Bağlantı bir HTML ilan sayfası değil.");
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BYTES) throw new Error("İlan sayfası güvenli okuma sınırını aşıyor.");
    const html = await response.text();
    if (Buffer.byteLength(html) > MAX_BYTES) throw new Error("İlan sayfası güvenli okuma sınırını aşıyor.");
    return { url, content: readableText(html) };
  }
  throw new Error("İlan sayfası okunamadı.");
}
