import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

const blockedAddresses = new BlockList();
for (const [network, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) blockedAddresses.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32]] as const) blockedAddresses.addSubnet(network, prefix, "ipv6");

function isPrivateAddress(address: string): boolean {
  const mapped = address.toLowerCase().match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mapped) {
    const high = Number.parseInt(mapped[1], 16);
    const low = Number.parseInt(mapped[2], 16);
    return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  if (address.toLowerCase().startsWith("::ffff:")) return isPrivateAddress(address.slice(7));
  const family = isIP(address);
  return family === 0 || blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6");
}

interface ResolvedListingUrl { readonly url: URL; readonly address: string; readonly family: 4 | 6 }

async function resolvePublicListingUrl(value: string): Promise<ResolvedListingUrl> {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Yalnızca HTTPS ilan bağlantıları destekleniyor.");
  if (url.username || url.password || url.port) throw new Error("Bağlantı güvenli bir genel web adresi olmalı.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("Yerel ağ adresleri desteklenmiyor.");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) as 4 | 6 }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Özel veya yerel ağ adresleri desteklenmiyor.");
  return { url, address: addresses[0].address, family: addresses[0].family as 4 | 6 };
}

export async function assertPublicListingUrl(value: string): Promise<URL> {
  return (await resolvePublicListingUrl(value)).url;
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
  let resolved = await resolvePublicListingUrl(value);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetchPinnedHtml(resolved);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location || redirect === MAX_REDIRECTS) throw new Error("İlan bağlantısı çok fazla yönlendirme içeriyor.");
      resolved = await resolvePublicListingUrl(new URL(location, resolved.url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new Error(`İlan sayfası okunamadı (${response.status}).`);
    const contentType = response.headers["content-type"] ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("Bağlantı bir HTML ilan sayfası değil.");
    const declaredLength = Number(response.headers["content-length"] ?? 0);
    if (declaredLength > MAX_BYTES) throw new Error("İlan sayfası güvenli okuma sınırını aşıyor.");
    return { url: resolved.url, content: readableText(response.body) };
  }
  throw new Error("İlan sayfası okunamadı.");
}

function fetchPinnedHtml(resolved: ResolvedListingUrl): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(resolved.url, {
      method: "GET",
      headers: { "User-Agent": "ExpiyaCarsListingReader/0.3", Accept: "text/html,application/xhtml+xml", "Accept-Encoding": "identity" },
      lookup: (_hostname, _options, callback) => callback(null, resolved.address, resolved.family),
      servername: resolved.url.hostname,
      agent: false,
    }, (response) => {
      const remoteAddress = response.socket.remoteAddress?.replace(/^::ffff:/, "");
      if (!remoteAddress || remoteAddress !== resolved.address.replace(/^::ffff:/, "") || isPrivateAddress(remoteAddress)) {
        response.destroy();
        reject(new Error("İlan bağlantısının ağ adresi güvenli biçimde doğrulanamadı."));
        return;
      }
      const headers = Object.fromEntries(Object.entries(response.headers).flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value[0] : value]]));
      let bytes = 0;
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) response.destroy(new Error("İlan sayfası güvenli okuma sınırını aşıyor."));
        else chunks.push(chunk);
      });
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers, body: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", reject);
    });
    request.setTimeout(10_000, () => request.destroy(new Error("İlan sayfası zamanında okunamadı.")));
    request.on("error", reject);
    request.end();
  });
}
