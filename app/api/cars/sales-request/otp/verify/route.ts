import { z } from "zod";
import { redactError, sameOrigin } from "@/features/sales-request/security.server";
import { verifyPhoneOtp } from "@/features/sales-request/otp.server";
const schema = z.object({ handoff: z.string().min(20).max(300_000), challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/u) }).strict();
export async function POST(request: Request) { try { if (!sameOrigin(request)) return Response.json({ error: "REQUEST_ORIGIN_REJECTED" }, { status: 403 }); const input = schema.parse(await request.json()); const result = verifyPhoneOtp(input); return Response.json({ verificationToken: result.verificationToken, expiresAt: result.expiresAt, verified: true }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return Response.json({ error: redactError(error), message: "Kod doğrulanamadı veya süresi doldu." }, { status: error instanceof z.ZodError ? 400 : 409 }); } }
