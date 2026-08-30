export function buildIyzicoCallbackRedirect(input: {
  readonly requestUrl: string;
  readonly configuredCallbackUrl?: string;
  readonly outcome: "success" | "failure";
  readonly accessCookie?: string;
}): Response {
  const publicOrigin = new URL(input.configuredCallbackUrl || input.requestUrl).origin;
  const destination = new URL("/cars/paid-comparison/status", publicOrigin);
  destination.searchParams.set("payment", input.outcome);
  return new Response(null, {
    status: 303,
    headers: {
      Location: destination.toString(),
      "Cache-Control": "no-store",
      ...(input.accessCookie ? { "Set-Cookie": input.accessCookie } : {}),
    },
  });
}
