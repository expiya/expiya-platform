import { z } from "zod";
import { openPhase3IntentHandoff } from "@/features/sales-advisor/handoff.server";
import { intents, intentLabels } from "@/features/sales-request/contracts";
import { DATA_CONTROLLER, LEGAL_READY, legalArtifacts } from "@/features/sales-request/legalArtifacts";
import { issueCsrfToken, redactError } from "@/features/sales-request/security.server";
import { buildShareableSalesSummary } from "@/features/sales-request/salesSummary.server";
import { isFakeDealerPilotEnabled, PILOT_FAKE_DEALER } from "@/features/sales-request/dealerDirectory.server";
const schema = z.object({ handoff: z.string().min(20).max(300_000), intent: z.enum(intents) }).strict();
export async function POST(request: Request) { try { const input = schema.parse(await request.json()); const opened = await openPhase3IntentHandoff(input.handoff, input.intent); const pilotDealer = isFakeDealerPilotEnabled() ? { displayName: PILOT_FAKE_DEALER.displayName, legalEntity: PILOT_FAKE_DEALER.legalEntity, status: PILOT_FAKE_DEALER.status } : null; return Response.json({ csrfToken: issueCsrfToken(), intent: opened.handoff.intent, intentLabel: intentLabels[opened.handoff.intent], vehicleTitle: opened.artifact.title, conversationSummary: buildShareableSalesSummary(opened.handoff), pilotDealer, legalArtifacts, controller: DATA_CONTROLLER, legalReady: LEGAL_READY, pilotReady: Boolean(pilotDealer) }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }); } catch (error) { return Response.json({ error: redactError(error) }, { status: error instanceof z.ZodError ? 400 : 409 }); } }
