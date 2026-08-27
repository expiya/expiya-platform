import { describe, expect, it } from "vitest";
import { legalArtifacts } from "./legalArtifacts";
import { salesRequestSchema } from "./contracts";
import { normalizePhone, redactError } from "./security.server";

const valid = { version:"phase3-sales-request/v1",handoff:"p3."+"a".repeat(30),idempotencyKey:"c4413656-c96d-4e9d-a8ea-9f5c0c1f637b",csrfToken:"a".repeat(24),phoneVerificationToken:"2fd8cc71-e20b-4a5a-a726-b0898b366fb0",conversationSummaryChecksum:"a".repeat(64),firstName:"Ayşe",lastName:"Yılmaz",phone:"5321234567",email:"ayse@example.com",province:"İstanbul",district:"Kadıköy",neighborhood:"Caferağa",preferredChannel:"PHONE",note:"Hafta içi ulaşabilirsiniz.",noticeAcknowledged:true,dealerTransferConsent:true,phoneContact:true,emailContact:false,marketingConsent:false,shareConversationSummary:false };
describe("phase3-sales-request/v1",()=>{
  it("accepts a basic request without marketing permission",()=>expect(salesRequestSchema.safeParse(valid).success).toBe(true));
  it("fails closed without dealer transfer consent or selected-channel permission",()=>{expect(salesRequestSchema.safeParse({...valid,dealerTransferConsent:false}).success).toBe(false);expect(salesRequestSchema.safeParse({...valid,phoneContact:false}).success).toBe(false);});
  it("requires email regardless of the preferred channel",()=>expect(salesRequestSchema.safeParse({...valid,email:""}).success).toBe(false));
  it("accepts only a Turkish mobile and a valid province/district pair",()=>{expect(salesRequestSchema.safeParse({...valid,phone:"2121234567"}).success).toBe(false);expect(salesRequestSchema.safeParse({...valid,district:"Çankaya"}).success).toBe(false);});
  it("keeps neighborhood optional and bounded",()=>{expect(salesRequestSchema.safeParse({...valid,neighborhood:""}).success).toBe(true);expect(salesRequestSchema.safeParse({...valid,neighborhood:"x".repeat(81)}).success).toBe(false);});
  it("rejects sensitive free text and unknown fields",()=>{expect(salesRequestSchema.safeParse({...valid,note:"TC kimlik 12345678901"}).success).toBe(false);expect(salesRequestSchema.safeParse({...valid,exactVariantId:"tamper"}).success).toBe(false);});
  it("normalizes Turkish mobile numbers and rejects invalid numbers",()=>{expect(normalizePhone("0532 123 45 67")).toBe("+905321234567");expect(()=>normalizePhone("123")).toThrow("PHONE_INVALID");});
  it("keeps notice and consents versioned, separate and checksummed",()=>{expect(legalArtifacts.kvkkNotice.version).toBe("kvkk-notice/v1");expect(legalArtifacts.dealerTransfer.version).toBe("dealer-transfer-consent/v1");expect(legalArtifacts.commercial.version).toBe("commercial-communications-consent/v1");expect(legalArtifacts.conversationSummary.version).toBe("sales-conversation-summary-consent/v1");expect(new Set(Object.values(legalArtifacts).map(x=>x.checksum)).size).toBe(4);});
  it("redacts PII-shaped errors",()=>expect(redactError(new Error("ayse@example.com"))).toBe("SALES_REQUEST_REJECTED"));
});
