import {describe,expect,it} from "vitest";
import {signFeedRequest,verifyFeedRequest,type FeedRequestAuth} from "./inventory/feedAuthentication";
const base:Omit<FeedRequestAuth,"signature">={tenantId:"t1",serviceAccountId:"s1",scope:"INVENTORY_IMPORT",timestampSeconds:1000,nonce:"n1",bodyChecksum:`sha256:${"a".repeat(64)}`,keyVersion:"v1"};const auth:FeedRequestAuth={...base,signature:signFeedRequest(base,"secret")};
describe("feed request authentication",()=>{
 it("accepts a signed tenant-scoped request without write authorization",()=>expect(verifyFeedRequest({auth,secret:"secret",nowSeconds:1001,usedNonces:new Set(),expectedTenantId:"t1"})).toMatchObject({allowed:true,maximumRequestsPerMinute:10,writeAuthorized:false}));
 it("rejects replay and stale requests",()=>{expect(verifyFeedRequest({auth,secret:"secret",nowSeconds:1001,usedNonces:new Set(["n1"]),expectedTenantId:"t1"})).toMatchObject({allowed:false,reason:"NONCE_REPLAY"});expect(verifyFeedRequest({auth,secret:"secret",nowSeconds:2000,usedNonces:new Set(),expectedTenantId:"t1"})).toMatchObject({allowed:false,reason:"TIMESTAMP_OUT_OF_WINDOW"});});
 it("rejects cross-tenant and invalid signatures",()=>{expect(verifyFeedRequest({auth,secret:"secret",nowSeconds:1001,usedNonces:new Set(),expectedTenantId:"t2"})).toMatchObject({allowed:false,reason:"TENANT_MISMATCH"});expect(verifyFeedRequest({auth:{...auth,signature:`hmac-sha256:${"0".repeat(64)}`},secret:"secret",nowSeconds:1001,usedNonces:new Set(),expectedTenantId:"t1"})).toMatchObject({allowed:false,reason:"SIGNATURE_INVALID"});});
});
