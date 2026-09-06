import type {TelemetryStream,UsedCarsTelemetryEvent} from "./telemetry";
export interface TelemetrySinkPolicy {readonly stream:TelemetryStream;readonly sink:"PRODUCT_ORGANIC"|"PRODUCT_SPONSORED"|"PARTNER_OPERATIONS"|"TRUST_OPERATIONS"|"SECURITY_SIEM";readonly rawPayloadStored:false;readonly tenantScopedAccess:boolean;readonly rankingConsumerAllowed:false}
export const telemetrySinkPolicies:readonly TelemetrySinkPolicy[]=Object.freeze([
 {stream:"B2C_ORGANIC",sink:"PRODUCT_ORGANIC",rawPayloadStored:false,tenantScopedAccess:false,rankingConsumerAllowed:false},
 {stream:"B2C_SPONSORED",sink:"PRODUCT_SPONSORED",rawPayloadStored:false,tenantScopedAccess:false,rankingConsumerAllowed:false},
 {stream:"PARTNER_OPERATION",sink:"PARTNER_OPERATIONS",rawPayloadStored:false,tenantScopedAccess:true,rankingConsumerAllowed:false},
 {stream:"PLATFORM_MODERATION",sink:"TRUST_OPERATIONS",rawPayloadStored:false,tenantScopedAccess:false,rankingConsumerAllowed:false},
 {stream:"SECURITY",sink:"SECURITY_SIEM",rawPayloadStored:false,tenantScopedAccess:false,rankingConsumerAllowed:false},
]);
export function validateStreamSeparation(event:UsedCarsTelemetryEvent):readonly string[]{const codes:string[]=[];const keys=Object.keys(event.attributes);if(event.stream==="B2C_ORGANIC"&&keys.some(key=>["campaignId","planCode","monthlyFeeTry","sponsored"].includes(key)))codes.push("COMMERCIAL_FIELD_IN_ORGANIC_STREAM");if(event.stream==="B2C_SPONSORED"&&(typeof event.attributes.campaignId!=="string"||event.attributes.sponsored!==true))codes.push("SPONSORED_ATTRIBUTION_REQUIRED");if(event.stream!=="SECURITY"&&keys.some(key=>key==="ipAddress"||key==="userAgent"))codes.push("SECURITY_ATTRIBUTE_WRONG_STREAM");return Object.freeze(codes);}
