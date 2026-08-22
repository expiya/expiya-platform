import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticatePilotUser, createPilotSessionToken, PILOT_SESSION_COOKIE } from "@/features/pilot/pilotSession.server";
import { enforceRateLimit } from "@/lib/security/requestSecurity";

const schema = z.object({ username: z.string().min(1).max(80), password: z.string().min(8).max(200) });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(request.url).origin !== origin) return NextResponse.json({ message: "Geçersiz istek kaynağı." }, { status: 403 });
  const limited = await enforceRateLimit(request, { scope: "cars-pilot-login", limit: 10, windowMs: 15 * 60_000 }); if (limited) return limited;
  const form = await request.formData();
  const parsed = schema.safeParse({ username: form.get("username"), password: form.get("password") });
  const session = parsed.success ? authenticatePilotUser(parsed.data.username, parsed.data.password) : null;
  if (!session) return NextResponse.redirect(new URL("/pilot?error=1", request.url), 303);
  const response = NextResponse.redirect(new URL("/pilot", request.url), 303);
  response.cookies.set(PILOT_SESSION_COOKIE, createPilotSessionToken(session), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: new Date(session.expiresAt), priority: "high" });
  return response;
}
