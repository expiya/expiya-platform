import {currentUsedCarsCommercialReadiness} from "./commercialReadiness";
import {currentUsedCarsConversationalCommerceReadiness} from "./conversationalCommerceReadiness";
import {currentUsedCarsDeploymentTopologyReadiness} from "./deploymentTopologyReadiness";
import {currentUsedCarsIdentityReadiness} from "./identityReadinessSnapshot";
import {currentUsedCarsFeedIntegrationReadiness} from "./feedIntegrationReadiness";
import {currentUsedCarsDisasterRecoveryReadiness} from "./disasterRecoveryReadiness";
import {currentUsedCarsPrivacyOperationsReadiness} from "./privacyOperationsReadiness";
import {currentUsedCarsMigrationReadiness} from "./migrationReadinessSnapshot";
import {currentUsedCarsModerationIncidentReadiness} from "./moderationIncidentReadiness";
import {currentUsedCarsObservabilityReadiness} from "./observabilityReadiness";
import {currentUsedCarsPilotOperationsReadiness} from "./pilotOperationsReadiness";
import {currentUsedCarsTaxonomyReleaseReadiness} from "./taxonomyReleaseReadiness";
import {currentUsedCarsModelGovernanceReadiness} from "./modelGovernanceReadiness";
import {currentUsedCarsProductGovernanceReadiness} from "./productGovernanceReadiness";
import {currentUsedCarsVendorGovernanceReadiness} from "./vendorGovernanceReadiness";
import {currentUsedCarsDataGovernanceReadiness} from "./dataGovernanceReadiness";
import {currentUsedCarsLegalGovernanceReadiness} from "./legalGovernanceReadiness";
import {currentUsedCarsHumanOperationsReadiness} from "./humanOperationsReadiness";
import {currentUsedCarsDataQualityReadiness} from "./dataQualityReadiness";
import {currentUsedCarsExperimentGovernanceReadiness} from "./experimentGovernanceReadiness";
import {currentUsedCarsAccessibilityReadiness} from "./accessibilityReadiness";
import {currentUsedCarsContentGovernanceReadiness} from "./contentGovernanceReadiness";
import {currentUsedCarsApiGovernanceReadiness} from "./apiGovernanceReadiness";
import {currentUsedCarsSupplyChainReadiness} from "./supplyChainReadiness";
import {currentUsedCarsSecurityValidationReadiness} from "./securityValidationReadiness";

export type LaunchDomain="IDENTITY"|"DATABASE_RLS"|"TAXONOMY"|"PILOT_OPERATIONS"|"MODERATION_INCIDENT"|"COMMERCIAL"|"CONVERSATIONAL_COMMERCE"|"MODEL_GOVERNANCE"|"PRODUCT_GOVERNANCE"|"VENDOR_GOVERNANCE"|"DATA_GOVERNANCE"|"LEGAL_GOVERNANCE"|"HUMAN_OPERATIONS"|"DATA_QUALITY"|"EXPERIMENT_GOVERNANCE"|"ACCESSIBILITY"|"CONTENT_GOVERNANCE"|"API_GOVERNANCE"|"SUPPLY_CHAIN"|"SECURITY_VALIDATION"|"DEPLOYMENT"|"OBSERVABILITY"|"FEED_INTEGRATION"|"RESILIENCE"|"PRIVACY_OPERATIONS";
export type LaunchStage="SYNTHETIC_MVP"|"STAGING_INTEGRATION"|"CONTROLLED_PILOT"|"PRODUCTION";
export interface LaunchDomainStatus {readonly domain:LaunchDomain;readonly ready:boolean;readonly missing:readonly string[]}

export function getLaunchDomainStatuses():readonly LaunchDomainStatus[]{return Object.freeze([
 {domain:"IDENTITY",ready:currentUsedCarsIdentityReadiness.ready,missing:currentUsedCarsIdentityReadiness.missing},
 {domain:"DATABASE_RLS",ready:currentUsedCarsMigrationReadiness.ready,missing:currentUsedCarsMigrationReadiness.missing},
 {domain:"TAXONOMY",ready:currentUsedCarsTaxonomyReleaseReadiness.ready,missing:currentUsedCarsTaxonomyReleaseReadiness.missing},
 {domain:"PILOT_OPERATIONS",ready:currentUsedCarsPilotOperationsReadiness.ready,missing:currentUsedCarsPilotOperationsReadiness.missing},
 {domain:"MODERATION_INCIDENT",ready:currentUsedCarsModerationIncidentReadiness.ready,missing:currentUsedCarsModerationIncidentReadiness.missing},
 {domain:"COMMERCIAL",ready:currentUsedCarsCommercialReadiness.ready,missing:currentUsedCarsCommercialReadiness.missing},
 {domain:"CONVERSATIONAL_COMMERCE",ready:currentUsedCarsConversationalCommerceReadiness.ready,missing:currentUsedCarsConversationalCommerceReadiness.missing},
 {domain:"MODEL_GOVERNANCE",ready:currentUsedCarsModelGovernanceReadiness.ready,missing:currentUsedCarsModelGovernanceReadiness.missing},
 {domain:"PRODUCT_GOVERNANCE",ready:currentUsedCarsProductGovernanceReadiness.ready,missing:currentUsedCarsProductGovernanceReadiness.missing},
 {domain:"VENDOR_GOVERNANCE",ready:currentUsedCarsVendorGovernanceReadiness.ready,missing:currentUsedCarsVendorGovernanceReadiness.missing},
 {domain:"DATA_GOVERNANCE",ready:currentUsedCarsDataGovernanceReadiness.ready,missing:currentUsedCarsDataGovernanceReadiness.missing},
 {domain:"LEGAL_GOVERNANCE",ready:currentUsedCarsLegalGovernanceReadiness.ready,missing:currentUsedCarsLegalGovernanceReadiness.missing},
 {domain:"HUMAN_OPERATIONS",ready:currentUsedCarsHumanOperationsReadiness.ready,missing:currentUsedCarsHumanOperationsReadiness.missing},
 {domain:"DATA_QUALITY",ready:currentUsedCarsDataQualityReadiness.ready,missing:currentUsedCarsDataQualityReadiness.missing},
 {domain:"EXPERIMENT_GOVERNANCE",ready:currentUsedCarsExperimentGovernanceReadiness.ready,missing:currentUsedCarsExperimentGovernanceReadiness.missing},
 {domain:"ACCESSIBILITY",ready:currentUsedCarsAccessibilityReadiness.ready,missing:currentUsedCarsAccessibilityReadiness.missing},
 {domain:"CONTENT_GOVERNANCE",ready:currentUsedCarsContentGovernanceReadiness.ready,missing:currentUsedCarsContentGovernanceReadiness.missing},
 {domain:"API_GOVERNANCE",ready:currentUsedCarsApiGovernanceReadiness.ready,missing:currentUsedCarsApiGovernanceReadiness.missing},
 {domain:"SUPPLY_CHAIN",ready:currentUsedCarsSupplyChainReadiness.ready,missing:currentUsedCarsSupplyChainReadiness.missing},
 {domain:"SECURITY_VALIDATION",ready:currentUsedCarsSecurityValidationReadiness.ready,missing:currentUsedCarsSecurityValidationReadiness.missing},
 {domain:"DEPLOYMENT",ready:currentUsedCarsDeploymentTopologyReadiness.ready,missing:currentUsedCarsDeploymentTopologyReadiness.missing},
 {domain:"OBSERVABILITY",ready:currentUsedCarsObservabilityReadiness.ready,missing:currentUsedCarsObservabilityReadiness.missing},
 {domain:"FEED_INTEGRATION",ready:currentUsedCarsFeedIntegrationReadiness.ready,missing:currentUsedCarsFeedIntegrationReadiness.missing},
 {domain:"RESILIENCE",ready:currentUsedCarsDisasterRecoveryReadiness.ready,missing:currentUsedCarsDisasterRecoveryReadiness.missing},
 {domain:"PRIVACY_OPERATIONS",ready:currentUsedCarsPrivacyOperationsReadiness.ready,missing:currentUsedCarsPrivacyOperationsReadiness.missing},
]);}

const requiredDomains:Readonly<Record<LaunchStage,readonly LaunchDomain[]>>={SYNTHETIC_MVP:[],STAGING_INTEGRATION:["IDENTITY","DATABASE_RLS","MODEL_GOVERNANCE","PRODUCT_GOVERNANCE","VENDOR_GOVERNANCE","DATA_GOVERNANCE","LEGAL_GOVERNANCE","HUMAN_OPERATIONS","DATA_QUALITY","EXPERIMENT_GOVERNANCE","ACCESSIBILITY","CONTENT_GOVERNANCE","API_GOVERNANCE","SUPPLY_CHAIN","SECURITY_VALIDATION","DEPLOYMENT","OBSERVABILITY","FEED_INTEGRATION","RESILIENCE","PRIVACY_OPERATIONS"],CONTROLLED_PILOT:["IDENTITY","DATABASE_RLS","TAXONOMY","PILOT_OPERATIONS","MODERATION_INCIDENT","MODEL_GOVERNANCE","PRODUCT_GOVERNANCE","VENDOR_GOVERNANCE","DATA_GOVERNANCE","LEGAL_GOVERNANCE","HUMAN_OPERATIONS","DATA_QUALITY","EXPERIMENT_GOVERNANCE","ACCESSIBILITY","CONTENT_GOVERNANCE","API_GOVERNANCE","SUPPLY_CHAIN","SECURITY_VALIDATION","DEPLOYMENT","OBSERVABILITY","FEED_INTEGRATION","RESILIENCE","PRIVACY_OPERATIONS"],PRODUCTION:["IDENTITY","DATABASE_RLS","TAXONOMY","PILOT_OPERATIONS","MODERATION_INCIDENT","COMMERCIAL","CONVERSATIONAL_COMMERCE","MODEL_GOVERNANCE","PRODUCT_GOVERNANCE","VENDOR_GOVERNANCE","DATA_GOVERNANCE","LEGAL_GOVERNANCE","HUMAN_OPERATIONS","DATA_QUALITY","EXPERIMENT_GOVERNANCE","ACCESSIBILITY","CONTENT_GOVERNANCE","API_GOVERNANCE","SUPPLY_CHAIN","SECURITY_VALIDATION","DEPLOYMENT","OBSERVABILITY","FEED_INTEGRATION","RESILIENCE","PRIVACY_OPERATIONS"]};
export function assessLaunchStage(stage:LaunchStage){const statuses=getLaunchDomainStatuses();const required=requiredDomains[stage];const blockers=statuses.filter(status=>required.includes(status.domain)&&!status.ready);return Object.freeze({stage,ready:stage==="SYNTHETIC_MVP"||blockers.length===0,requiredDomains:required,blockers:Object.freeze(blockers),externalSideEffectsAuthorized:false as const});}
