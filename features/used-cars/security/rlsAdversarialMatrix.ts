export type RlsAdversarialSurface = "TENANT_ROW" | "BRANCH_ROW" | "COMPOSITE_FK" | "IMPORT" | "MODERATION" | "PUBLIC_READER" | "POOL_CONTEXT" | "TENANT_CLOSURE" | "PRIVILEGED_ROLE" | "EXPORT";
export interface RlsAdversarialScenario {
  readonly id:string; readonly surface:RlsAdversarialSurface; readonly attempt:string;
  readonly expected:"DENY"|"EMPTY_RESULT"|"ROLLBACK"|"ZERO_PUBLIC_ROWS"; readonly auditRequired:boolean; readonly automatedBeforeMigration:true;
}
export const usedCarsRlsAdversarialMatrix:readonly RlsAdversarialScenario[]=Object.freeze([
  {id:"RLS-001",surface:"TENANT_ROW",attempt:"Dealer role reads another tenant inventory by UUID",expected:"EMPTY_RESULT",auditRequired:false,automatedBeforeMigration:true},
  {id:"RLS-002",surface:"BRANCH_ROW",attempt:"Branch role reads an unassigned branch in same tenant",expected:"EMPTY_RESULT",auditRequired:false,automatedBeforeMigration:true},
  {id:"RLS-003",surface:"TENANT_ROW",attempt:"Client changes tenant_id during UPDATE",expected:"DENY",auditRequired:true,automatedBeforeMigration:true},
  {id:"RLS-004",surface:"COMPOSITE_FK",attempt:"Child row references parent UUID owned by another tenant",expected:"DENY",auditRequired:true,automatedBeforeMigration:true},
  {id:"RLS-005",surface:"IMPORT",attempt:"Import row supplies a different tenant_id",expected:"ROLLBACK",auditRequired:true,automatedBeforeMigration:true},
  {id:"RLS-006",surface:"MODERATION",attempt:"Moderator opens a subject or document outside assigned task grant",expected:"DENY",auditRequired:true,automatedBeforeMigration:true},
  {id:"RLS-007",surface:"PUBLIC_READER",attempt:"Public reader selects base inventory, VIN, plate or document tables",expected:"DENY",auditRequired:true,automatedBeforeMigration:true},
  {id:"RLS-008",surface:"POOL_CONTEXT",attempt:"Reused connection observes previous request tenant context",expected:"EMPTY_RESULT",auditRequired:true,automatedBeforeMigration:true},
  {id:"RLS-009",surface:"TENANT_CLOSURE",attempt:"Suspended tenant listings remain public during async cleanup",expected:"ZERO_PUBLIC_ROWS",auditRequired:true,automatedBeforeMigration:true},
  {id:"RLS-010",surface:"PRIVILEGED_ROLE",attempt:"Runtime role owns tables or receives BYPASSRLS",expected:"DENY",auditRequired:true,automatedBeforeMigration:true},
  {id:"RLS-011",surface:"EXPORT",attempt:"Report viewer exports person or listing level lead rows",expected:"DENY",auditRequired:true,automatedBeforeMigration:true},
  {id:"RLS-012",surface:"TENANT_ROW",attempt:"Missing app.tenant_id session setting falls back to caller input",expected:"EMPTY_RESULT",auditRequired:true,automatedBeforeMigration:true},
]);

export function assessRlsAdversarialCoverage(executedScenarioIds:readonly string[]):{readonly complete:boolean;readonly missing:readonly string[]} {
  const executed=new Set(executedScenarioIds);const missing=usedCarsRlsAdversarialMatrix.filter(scenario=>!executed.has(scenario.id)).map(scenario=>scenario.id);
  return Object.freeze({complete:missing.length===0,missing:Object.freeze(missing)});
}
