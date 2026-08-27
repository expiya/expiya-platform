import { z } from "zod";
import { openPhase2Experience } from "@/features/sales-advisor/handoff.server";
import { enforcePhase2RateLimits, phase2SafeError, phase2SessionSubject, phase2Subjects, readPhase2Json } from "@/features/sales-advisor/security.server";

const schema = z.object({ token: z.string().min(1).max(300_000) }).strict();
export async function POST(request: Request) {
  try { const { token } = schema.parse(await readPhase2Json(request, 80_000)); await enforcePhase2RateLimits(request, "EXPERIENCE", [phase2SessionSubject(token)], "CLIENT_ONLY"); const opened = await openPhase2Experience(token); await enforcePhase2RateLimits(request, "EXPERIENCE", [phase2SessionSubject(token), ...phase2Subjects(opened.handoff)], "SUBJECTS_ONLY"); return Response.json(opened, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return phase2SafeError(error); }
}
