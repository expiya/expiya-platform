export function requireIyzicoCallbackUrl(environment: { readonly IYZICO_CALLBACK_URL?: string; readonly IYZICO_ENV?: string }): string {
  const value = environment.IYZICO_CALLBACK_URL?.trim();
  if (!value) throw new TypeError("IYZICO_CALLBACK_URL_REQUIRED");
  const parsed = new URL(value);
  const sandboxLocal = (environment.IYZICO_ENV ?? "sandbox") === "sandbox" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !sandboxLocal) throw new TypeError("IYZICO_CALLBACK_URL_HTTPS_REQUIRED");
  if (parsed.username || parsed.password || parsed.hash) throw new TypeError("IYZICO_CALLBACK_URL_INVALID");
  return parsed.toString();
}
