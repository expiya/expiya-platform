import { createHash, randomUUID } from "node:crypto";
import { canonicalize } from "@/features/decision/v2/fingerprint/canonicalize";
import type { AppliancesConversationState, AppliancesLedgerEvent, AppliancesRuntimeOutcome } from "../contracts";
import { deterministicPayloadHash } from "../persistence/service";
import type { AppliancesConversationStore } from "../persistence/types";
import type { AppliancesDecisionCard } from "../recommendation/publicCard";
import { loadActiveDryerAuthority, type DryerAuthority } from "./authority.server";
import type { DryerDecisionArtifact, DryerDecisionAuthorization, DryerDecisionRecord } from "./types";
import { isUnboundShortAnswer, pendingAnswerPolarity } from "../conversation/pendingAnswer";
import { executeValidatedTurn } from "../../conversation-kernel/executeValidatedTurn";
import { recordAskedQuestion } from "../../conversation-kernel/lifecycle";
import type { RunAppliancesTurnResult } from "../context/runtime.server";
import { projectAppliancesBudgetStatus } from "../budgetPublic";
import { brandRelaxationOutcome, filterByActiveBrand } from "../brandConstraint";
import { renderDomainReentry } from "@/features/xpy/assistant";
import { requireXpyReentry } from "@/features/xpy/domainPacks";
import { appliancesXInterruption } from "../xpyAssistant";
import { appliancesRuntimeBinding } from "../xpyRuntime";

const hash = (value: unknown) => createHash("sha256").update(canonicalize(value)).digest("hex");
const accepted = new Set(["ACCEPTED_EXPLICIT", "ACCEPTED_CONFIRMED", "ACCEPTED_INTERPRETED"]);
type Parsed = { conceptId: string; value: unknown; kind: "SET" | "CORRECT" | "CLEAR"; span: string };

function parse(message: string, lastQuestionKey?: string): Parsed[] {
  const out: Parsed[] = [], correction = /aslında|düzelt/iu.test(message);
  const add = (conceptId: string, value: unknown, span: string, kind: Parsed["kind"] = correction ? "CORRECT" : "SET") => out.push({ conceptId, value, span, kind });
  const polarity = pendingAnswerPolarity(message);
  if (polarity === "NO" && lastQuestionKey === "appliances.dryer.installationFit") add("INSTALLATION_FIT", { declined: true }, message);
  if (polarity === "NO" && lastQuestionKey === "appliances.dryer.capacity") add("DRYING_CAPACITY", { declined: true }, message);
  for (const [pattern, concept] of [[/bütçe(?:yi|mi).*(?:kaldır|boş ver|unut)/iu, "BUDGET_SENSITIVITY"], [/(?:sessiz|gürültü).*(?:önemli değil|boş ver|unut)/iu, "LOW_NOISE_PRIORITY"], [/(?:ölçü|derinlik|genişlik|yükseklik).*(?:kaldır|boş ver|unut)/iu, "INSTALLATION_FIT"]] as const) { const m = message.match(pattern); if (m) add(concept, null, m[0], "CLEAR"); }
  const capacity = message.match(/(?:en az\s*)?(\d{1,2})\s*(?:kg|kilo)/iu); if (capacity) add("DRYING_CAPACITY", { minimumKg: Number(capacity[1]) }, capacity[0]);
  if (!capacity && lastQuestionKey === "appliances.dryer.capacity" && /^\s*\d{1,2}\s*$/u.test(message)) add("DRYING_CAPACITY", { minimumKg: Number(message.trim()) }, message);
  const budget = message.match(/(?:bütçem(?:\s+en fazla)?|(?:en fazla|max(?:imum)?)\s+bütçem)\s*(\d{1,7}(?:[ .]\d{3})?)\s*(bin)?\s*(?:tl|₺)?/iu); if (budget) { const value = Number(budget[1].replace(/[ .]/gu, "")); add("BUDGET_SENSITIVITY", { maximumTry: budget[2] && value < 1000 ? value * 1000 : value }, budget[0]); }
  const geometry: Record<string, number> = {}; let geometrySpan = "";
  for (const [label, field] of [["genişlik", "maxWidthMm"], ["yükseklik", "maxHeightMm"], ["derinlik", "maxDepthMm"], ["kapak açık derinlik", "maxDoorOpenDepthMm"]]) { const m = message.match(new RegExp(`${label}\\s*(?:en fazla\\s*)?(\\d{1,4}(?:[.,]\\d+)?)\\s*(cm|mm)`, "iu")); if (m) { geometry[field] = Number(m[1].replace(",", ".")) * (m[2].toLowerCase() === "cm" ? 10 : 1); geometrySpan += `${m[0]} `; } }
  if (geometrySpan) add("INSTALLATION_FIT", geometry, geometrySpan.trim());
  for (const [pattern, concept] of [[/sık sık|haftada\s*(?:\d+|her gün)|çamaşır (?:çok|fazla) çıkıyor/iu,"DRYING_FREQUENCY"],[/yorgan|nevresim|battaniye/iu,"DUVET_DRYING"],[/hassas|narin/iu,"DELICATE_CARE"],[/yünlü|yün/iu,"WOOL_CARE"],[/outdoor|spor kıyafet|goretex/iu,"OUTDOOR_CARE"],[/hijyenik kurutma/iu,"HYGIENIC_DRYING"],[/direkt tahliye|gidere bağ/iu,"DIRECT_DRAIN_NEED"],[/sessiz|gürültü/iu,"LOW_NOISE_PRIORITY"]] as const) { const m=message.match(pattern); if(m) add(concept,true,m[0]); }
  const noDrain=message.match(/gider bağlantım yok|gidere bağlayamam/iu);if(noDrain)add("DIRECT_DRAIN_NEED",false,noDrain[0]);
  return out;
}

function domainResponse(message: string): AppliancesRuntimeOutcome | undefined {
  if (/(ısı pompası|enerji|ses|gürültü|nem|kuruluk).*(nedir|ne demek|ne işe yarar)/iu.test(message)) return { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", message: "Kurutucu verileri yalnız aynı ölçüm bağlamında karşılaştırılır. Isı pompası teknoloji türüdür; enerji faturası, sessizlik veya kumaş sonucu garantisi değildir.", conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: 0 };
  if (/^(merhaba|selam|teşekkürler|tamam)[.! ]*$/iu.test(message.trim())) return { kind: "RESPOND", responseKind: "SOCIAL_ACKNOWLEDGEMENT", message: "Rica ederim; kurutma makinesi karar bağlamını koruyorum.", conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: 0 };
  if (/hava nasıl|film öner/iu.test(message)) return { kind: "RESPOND", responseKind: "OFF_TOPIC_REDIRECT", message: renderDomainReentry(requireXpyReentry("APPLIANCES", "DRYER")), conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: 0 };
}

function activeEvents(state: AppliancesConversationState) { const superseded = new Set(state.ledger.filter(e => e.supersedesEventId).map(e => e.supersedesEventId)); return state.ledger.filter(e => accepted.has(e.status) && !superseded.has(e.eventId)); }
function evaluate(authority: DryerAuthority, state: AppliancesConversationState) {
  const events = activeEvents(state), by = new Map(events.map(e => [e.conceptId, e]));
  let products = [...authority.pack.products]; const hardUnknown: string[] = [];
  const capacity = (by.get("DRYING_CAPACITY")?.normalizedValue as { minimumKg?: number } | undefined)?.minimumKg;
  if (capacity) products = products.filter(p => p.technicalFacts.capacityKg >= capacity);
  const fit = by.get("INSTALLATION_FIT")?.normalizedValue as Record<string, number> | undefined;
  if (fit) products = products.filter(p => { for (const [limit, fact] of [["maxWidthMm","widthMm"],["maxHeightMm","heightMm"],["maxDepthMm","depthMm"],["maxDoorOpenDepthMm","doorOpenDepthMm"]] as const) if (fit[limit] !== undefined) { const value=p.technicalFacts[fact]; if (value === null || value === undefined) { hardUnknown.push(`${p.productId}:${fact}`); return false; } if (value > fit[limit]) return false; } return true; });
  const programConcepts = ["DELICATE_CARE","WOOL_CARE","DUVET_DRYING","OUTDOOR_CARE","HYGIENIC_DRYING"];
  for (const concept of programConcepts) if (by.has(concept)) products = products.filter(p => (p.capabilities.programs as string[]).includes(concept));
  if (by.get("DIRECT_DRAIN_NEED")?.normalizedValue === true) products = products.filter(p => p.capabilities.directDrain === true);
  products = filterByActiveBrand(state, products, p => p.brand);
  return { events, products, hardUnknown };
}

function buildDecision(authority: DryerAuthority, state: AppliancesConversationState, product: DryerAuthority["pack"]["products"][number]): DryerDecisionRecord {
  const evaluation = evaluate(authority, state);
  const core = { schemaVersion: "dryer-recommendation-artifact/v1" as const, conversationId: state.conversationId, contextRevision: state.revision, selectedProductId: product.productId, eligibleProductIds: evaluation.products.map(p => p.productId), acceptedEventIds: evaluation.events.filter(e=>e.decisionUse!=="NONE").map(e => e.eventId), authorityDigest: authority.catalogDigest };
  const artifact: DryerDecisionArtifact = { ...core, artifactFingerprint: hash(core) };
  const authCore = { schemaVersion: "dryer-decision-authorization/v1" as const, conversationId: state.conversationId, contextRevision: state.revision, productId: product.productId, artifactFingerprint: artifact.artifactFingerprint };
  const authorization: DryerDecisionAuthorization = { ...authCore, authorityFingerprint: hash({ ...authCore, authorityDigest: authority.catalogDigest }) };
  const facts = product.technicalFacts, evidence = product.evidenceRefs;
  const card = { schemaVersion: "appliances-public-card/v1", identity: { productId: product.productId, brand: product.brand, model: product.model, configurationIdentity: product.configurationIdentity }, reasons: [`Doğrulanmış zorunlu koşullarını karşılayan tek ürün ${product.brand} ${product.model}.`], acceptedNeeds: evaluation.events.map(e => ({ eventId:e.eventId, conceptId:e.conceptId, value:e.normalizedValue, evidenceRefs:evidence })), nonSelectionNeeds: [], technicalEvidence: [{ evidenceRef:evidence[0], statement:`Anma kurutma kapasitesi ${facts.capacityKg} kg (${facts.capacityContext}).` }, ...(facts.depthMm ? [{ evidenceRef:evidence[0], statement:`Gövde ölçüleri ${facts.widthMm} × ${facts.heightMm} × ${facts.depthMm} mm.` }] : [])], capabilities: Object.entries(product.capabilities).filter(([,v])=>v===true).map(([key])=>({evidenceRef:evidence[0],statement:`${key}: üretici kaynağında mevcut.`,evidence:{parameters:{}}})), dailyLife: [{ semanticRef:"DRYER_SEMANTIC_REGISTRY/v0.1", statement:"Kapasite bir yük sınırıdır; hane büyüklüğünden tek başına uygunluk sonucu çıkarılmaz." }], limitations: ["Enerji ve ses değerleri, ölçüm rejimi bilinmiyorsa karşılaştırma veya sıralama için kullanılmaz."], disclosures: [{id:"dryer-price-unknown",category:"PRICE",message:"Güncel fiyat bilinmiyor; teknik aday bütçe nedeniyle elenmedi."}], price:{status:"UNAVAILABLE",products:[{productId:product.productId,status:"PRICE_UNKNOWN"}],observations:[],budgetUnknownAlternatives:authority.pack.products.filter(p=>p.productId!==product.productId).map(p=>({productId:p.productId,brand:p.brand,model:p.model})),snapshot:{expiresAt:"unknown"}}, lifecycleAndMarket:{market:"TR",status:"CURRENT_TR"}, warranty:[], provenance:{authorizationFingerprint:authorization.authorityFingerprint,artifactFingerprint:artifact.artifactFingerprint,catalog:{release:authority.releaseVersion,digest:authority.catalogDigest},semantic:{id:"DRYER_SEMANTIC_REGISTRY/v0.1",digest:authority.semanticDigest},selectionFingerprint:hash(evaluation.products.map(p=>p.productId)),constructionPolicyDigest:authority.catalogDigest,questionPolicy:{id:"DRYER_DOMAIN_PACK/v0.1",digest:authority.catalogDigest},sufficiencyPolicy:{id:"DRYER_DOMAIN_PACK/v0.1",digest:authority.catalogDigest},selectionPolicy:{id:"DRYER_DOMAIN_PACK/v0.1",digest:authority.catalogDigest},contextRevision:state.revision,contextFingerprint:hash(evaluation.events),candidateEvaluationFingerprint:hash(evaluation.products),sufficiencyFingerprint:hash({eligible:evaluation.products.length}),candidatePoolFingerprint:hash(evaluation.products.map(p=>p.productId))} } as unknown as AppliancesDecisionCard;
  return { artifact, authorization, card };
}

function nextOutcome(authority: DryerAuthority, state: AppliancesConversationState): { state: AppliancesConversationState; outcome: AppliancesRuntimeOutcome } {
  const result=evaluate(authority,state);
  if (!result.events.some(e=>e.conceptId==="DRYING_CAPACITY")) return { state:recordAskedQuestion(state,"appliances.dryer.capacity"), outcome:{kind:"ASK",questionKey:"appliances.dryer.capacity",message:"En az kaç kg kurutma kapasitesine ihtiyacın var?"} };
  if (!result.events.some(e=>e.conceptId==="INSTALLATION_FIT")) return { state:recordAskedQuestion(state,"appliances.dryer.installationFit"), outcome:{kind:"ASK",questionKey:"appliances.dryer.installationFit",message:"Yerleşeceği boşlukta kesin bir genişlik sınırı var mı? Varsa ölçüyü cm olarak yazabilirsin."} };
  if (result.products.length===0) { const relaxation=brandRelaxationOutcome(state); if(relaxation)return relaxation; return {state,outcome:{kind:"CLARIFY",questionKey:result.hardUnknown.length?"UNRESOLVED_HARD_UNCERTAINTY":"NO_RECOMMENDATION_ELIGIBLE_CANDIDATE",message:result.hardUnknown.length?"Zorunlu ölçü için bazı ürünlerde doğrulanmış veri yok; bu şartla güvenilir bir seçim yapılamaz.":"Belirttiğin zorunlu koşulları karşılayan doğrulanmış aday kalmadı."}}; }
  if (result.products.length!==1) return {state,outcome:{kind:"CLARIFY",questionKey:"TIED_SET_EXPLANATION",message:"Koşullar birden fazla ürünü eşit derecede uygun bırakıyor; senin için önemli bir tercih daha belirtmelisin.",selectionState:{kind:"TIED_SET_EXPLANATION",identities:result.products.map(p=>({productId:p.productId,brand:p.brand,model:p.model,configurationIdentity:p.configurationIdentity,market:"TR"})),disclosures:[{id:"dryer-no-tiebreak",category:"SELECTION",message:"Skor veya ağırlıkla gizli bir seçim yapılmadı.",evidenceRefs:["DRYER_DOMAIN_PACK/v0.1"]}],comparisons:[]}}};
  const record=buildDecision(authority,state,result.products[0]);
  const storedRecord=record as unknown as NonNullable<AppliancesConversationState["decisionRecord"]>;
  return {state:{...state,currentDecisionFingerprint:record.authorization.authorityFingerprint,decisionRecord:storedRecord},outcome:{kind:"DECISION_READY",message:`${record.card.identity.brand} ${record.card.identity.model}: doğrulanmış koşulları karşılayan tek ürün.`,decisionFingerprint:record.authorization.authorityFingerprint,card:record.card}}; 
}

export function recomputeDryerBudgetOutcome(authority:DryerAuthority,state:AppliancesConversationState){if(!authority.pack.products.length){const relaxation=brandRelaxationOutcome(state);if(relaxation)return relaxation;}const result=nextOutcome(authority,state),unknown=(state.budgetMode==="BUDGET_AS_DECISION_FILTER"&&state.budgetMetadata)?evaluate(authority,state).products.length:0;return{state:result.state,outcome:{...result.outcome,budget:projectAppliancesBudgetStatus(state,{compatible:0,incompatible:0,unknown,hasUsableCoverage:false})}};}

export async function runDryerConversationTurn(input:{store:AppliancesConversationStore;authority:DryerAuthority;conversationId:string;messageId:string;expectedRevision:number;message:string;now?:Date}) {
  const payloadHash=deterministicPayloadHash({action:"TURN",conversationId:input.conversationId,messageId:input.messageId,expectedRevision:input.expectedRevision,message:input.message});
  return executeValidatedTurn<AppliancesConversationState,Parsed,AppliancesLedgerEvent,AppliancesRuntimeOutcome,RunAppliancesTurnResult>({runtime:appliancesRuntimeBinding("DRYER"),expectedRevision:input.expectedRevision,messageId:input.messageId,payloadFingerprint:payloadHash,
  withoutDecision:state=>appliancesXInterruption(state,input.messageId,input.message,input.now),
  load:async()=>{const loaded=await input.store.load(input.conversationId);if(!loaded)return null;const replay=loaded.messages[input.messageId];return{state:loaded.state,...(replay?.outcome.publicOutcome?{replay:{payloadFingerprint:replay.payloadHash,outcome:replay.outcome.publicOutcome,state:loaded.state}}:{})};},authorityMatches:state=>state.productType==="DRYER"&&state.pinnedCatalogDigest===input.authority.catalogDigest,propose:state=>parse(input.message,state.lastQuestionKey),validate:proposals=>proposals.every(p=>input.authority.conceptIds.has(p.conceptId)&&p.value!==undefined)?{kind:"VALID",proposals}:{kind:"INVALID"},reduce:(prior,proposals)=>{
  const informational=domainResponse(input.message); const revision=prior.revision+1, createdAt=(input.now??new Date()).toISOString();
  const ledger=[...prior.ledger], events:AppliancesLedgerEvent[]=[];
  for(const proposal of proposals){
    const current=activeEvents({...prior,ledger}).find(event=>event.conceptId===proposal.conceptId);
    if(proposal.kind==="CORRECT"&&!current)return{kind:"INVALID" as const};
    if(current&&proposal.kind==="SET"&&JSON.stringify(current.normalizedValue)!==JSON.stringify(proposal.value))return{state:{...prior,revision,decisionRecord:undefined,currentDecisionFingerprint:undefined,updatedAt:createdAt},events:[],outcome:{kind:"CLARIFY" as const,questionKey:`CONTRADICTION:${proposal.conceptId}`,message:"Bu bilgi daha önce farklı kaydedilmiş. Bunun bir düzeltme olduğunu açıkça belirtir misin?"}};
    if(current){const terminal:AppliancesLedgerEvent={eventId:randomUUID(),conceptId:current.conceptId,normalizedValue:null,sourceMessageId:input.messageId,authority:"USER_EXPLICIT",strength:"HYPOTHESIS",status:proposal.kind==="CLEAR"?"CLEARED":"SUPERSEDED",decisionUse:"NONE",supersedesEventId:current.eventId,confirmationRequired:false,createdRevision:revision,createdAt};ledger.push(terminal);events.push(terminal);}
    if(proposal.kind!=="CLEAR"){const declined=typeof proposal.value==="object"&&proposal.value!==null&&(proposal.value as {declined?:unknown}).declined===true;const event:AppliancesLedgerEvent={eventId:randomUUID(),conceptId:proposal.conceptId,normalizedValue:proposal.value,sourceMessageId:input.messageId,sourceSpan:{start:input.message.indexOf(proposal.span),end:input.message.indexOf(proposal.span)+proposal.span.length,text:proposal.span},authority:"USER_EXPLICIT",strength:declined?"HYPOTHESIS":["INSTALLATION_FIT","DRYING_CAPACITY"].includes(proposal.conceptId)?"HARD":"STRONG",status:"ACCEPTED_EXPLICIT",decisionUse:declined?"NONE":["INSTALLATION_FIT","DRYING_CAPACITY"].includes(proposal.conceptId)?"HARD_FILTER":"SOFT_RANK",confirmationRequired:false,createdRevision:revision,createdAt};ledger.push(event);events.push(event);}
  }
  let state:AppliancesConversationState={...prior,revision,ledger,decisionRecord:undefined,currentDecisionFingerprint:undefined,updatedAt:createdAt}; let outcome:AppliancesRuntimeOutcome;
  if(informational&&!proposals.length) outcome=informational.kind === "RESPOND" ? {...informational,contextRevision:revision} : informational; else if(!proposals.length&&isUnboundShortAnswer(input.message)) outcome=prior.lastQuestionKey?{kind:"CLARIFY",questionKey:prior.lastQuestionKey,message:"Bu kısa yanıt için gerekli ölçüyü veya kapasiteyi açıkça belirtir misin?"}:{kind:"CLARIFY",questionKey:"UNBOUND_CONFIRMATION",message:"Bu kısa yanıtı bağlayabileceğim açık bir soru yok; hangi tercihi kastettiğini belirtir misin?"}; else {const advanced=nextOutcome(input.authority,state);state=advanced.state;outcome=advanced.outcome;}
  return {state,events,outcome};},isResult:()=>false,commit:async update=>{const committed=await input.store.commit({expectedRevision:update.expectedRevision,messageId:update.messageId,payloadHash:update.payloadFingerprint,nextState:update.state,events:update.events,outcomeKind:"CONTEXT_MUTATED",publicOutcome:update.outcome});return committed.status==="OK"?{status:"OK",outcome:committed.outcome.publicOutcome!,state:committed.outcome.state,replayed:false}:{status:committed.status};},unavailable:()=>({status:"STATE_UNAVAILABLE"}),payloadConflict:()=>({status:"MESSAGE_PAYLOAD_CONFLICT"}),revisionConflict:()=>({status:"REVISION_CONFLICT"}),authorityMismatch:()=>({status:"AUTHORITY_MISMATCH"}),invalid:()=>({status:"INTEGRITY_FAILURE"}),replay:stored=>({status:"OK",outcome:stored.outcome,state:stored.state,replayed:true})});
}

export async function recoverDryerCard(state:AppliancesConversationState):Promise<AppliancesDecisionCard>{const loaded=await loadActiveDryerAuthority(process.cwd());if(loaded.status!=="READY")throw new Error(loaded.reason);const record=state.decisionRecord as unknown as DryerDecisionRecord|undefined;if(!record||record.authorization.contextRevision!==state.revision||record.authorization.authorityFingerprint!==state.currentDecisionFingerprint)throw new Error("STALE_DRYER_AUTHORIZATION");const rebuilt=buildDecision(loaded.snapshot,{...state,decisionRecord:undefined},loaded.snapshot.pack.products.find(p=>p.productId===record.authorization.productId)!);if(rebuilt.authorization.authorityFingerprint!==record.authorization.authorityFingerprint)throw new Error("DRYER_AUTHORIZATION_MISMATCH");return rebuilt.card;}
