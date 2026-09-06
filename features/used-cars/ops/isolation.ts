export const opsHostIsolation = Object.freeze({
  canonicalHost:"ops.expiya.com", publicHosts:["expiya.com","www.expiya.com"], partnerHost:"partner.expiya.com",
  audience:"urn:expiya:ops", cookie:"__Host-expiya_ops_session", sharedDeploymentRequired:false as const,
  productionRoutePrefix:"/", localPrototypeRoutePrefix:"/ops-demo",
});
export function authorizeOpsHost(input:{readonly host:string;readonly pathname:string;readonly production:boolean}) {
  const host=input.host.toLowerCase().split(":")[0];
  if (input.production) return {allowed:host===opsHostIsolation.canonicalHost, reason:host===opsHostIsolation.canonicalHost?null:"OPS_HOST_REQUIRED"};
  return {allowed:(host==="localhost"||host==="127.0.0.1")&&input.pathname.startsWith(opsHostIsolation.localPrototypeRoutePrefix), reason:null};
}

