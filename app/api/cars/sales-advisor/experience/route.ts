import { z } from "zod";
import { CARS_XPY_STAGE_TWO_ADAPTER, resolveCarsComparison } from "@/features/sales-advisor/xpyStageTwoAdapter.server";
import { enforcePhase2RateLimits, phase2SafeError, phase2SessionSubject, phase2Subjects, readPhase2Json } from "@/features/sales-advisor/security.server";

const schema = z.object({ token: z.string().min(1).max(300_000) }).strict();
export async function POST(request: Request) {
  try { const { token } = schema.parse(await readPhase2Json(request, 80_000)); await enforcePhase2RateLimits(request, "EXPERIENCE", [phase2SessionSubject(token)], "CLIENT_ONLY"); const opened = await CARS_XPY_STAGE_TWO_ADAPTER.openSignedHandoff(token); await enforcePhase2RateLimits(request, "EXPERIENCE", [phase2SessionSubject(token), ...phase2Subjects(opened.handoff)], "SUBJECTS_ONLY"); const comparison = await resolveCarsComparison(opened); const projection = CARS_XPY_STAGE_TWO_ADAPTER.project({ ...opened, comparisonArtifacts: comparison.comparisonArtifacts }, comparison.entitlement); return Response.json({ ...opened, comparisonEntitlement: comparison.entitlement, projection }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return phase2SafeError(error); }
}
