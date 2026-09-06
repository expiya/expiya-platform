import { handleNativeAppliancesConversationRequest } from "@/features/appliances/nativeConversationRoute.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleNativeAppliancesConversationRequest(request);
}
