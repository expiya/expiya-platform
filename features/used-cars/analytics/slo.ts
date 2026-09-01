export type UsedCarsSloId="PUBLIC_READ_AVAILABILITY"|"PARTNER_MUTATION_SUCCESS"|"LEAD_HANDOFF_SAFETY"|"STOCK_FRESHNESS"|"MODERATION_SLA"|"TENANT_ISOLATION";
export interface UsedCarsSlo {readonly id:UsedCarsSloId;readonly target:number;readonly windowDays:number;readonly minimumTraffic:number;readonly pageOnBreach:boolean;readonly zeroTolerance:boolean}
export const usedCarsSlos:readonly UsedCarsSlo[]=Object.freeze([
 {id:"PUBLIC_READ_AVAILABILITY",target:.999,windowDays:30,minimumTraffic:1000,pageOnBreach:false,zeroTolerance:false},
 {id:"PARTNER_MUTATION_SUCCESS",target:.995,windowDays:30,minimumTraffic:100,pageOnBreach:false,zeroTolerance:false},
 {id:"LEAD_HANDOFF_SAFETY",target:1,windowDays:30,minimumTraffic:1,pageOnBreach:true,zeroTolerance:true},
 {id:"STOCK_FRESHNESS",target:.95,windowDays:7,minimumTraffic:100,pageOnBreach:false,zeroTolerance:false},
 {id:"MODERATION_SLA",target:.95,windowDays:7,minimumTraffic:20,pageOnBreach:false,zeroTolerance:false},
 {id:"TENANT_ISOLATION",target:1,windowDays:30,minimumTraffic:1,pageOnBreach:true,zeroTolerance:true},
]);
export function evaluateSlo(input:{readonly slo:UsedCarsSlo;readonly good:number;readonly total:number}){if(input.total<input.slo.minimumTraffic)return Object.freeze({status:"INSUFFICIENT_DATA" as const,ratio:null,budgetRemaining:null,page:false});const ratio=input.total===0?0:input.good/input.total;const budgetAllowed=input.slo.zeroTolerance?0:(1-input.slo.target)*input.total;const failures=input.total-input.good;const status=ratio>=input.slo.target?"HEALTHY" as const:"BREACHED" as const;return Object.freeze({status,ratio,budgetRemaining:Math.max(0,budgetAllowed-failures),page:status==="BREACHED"&&input.slo.pageOnBreach});}
