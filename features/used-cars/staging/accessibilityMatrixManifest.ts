import type { AccessibilitySurface } from "../accessibility/requirements";
export type AssistiveTechnology = "VOICEOVER_IOS" | "TALKBACK_ANDROID" | "NVDA_WINDOWS" | "VOICEOVER_MACOS" | "KEYBOARD_ONLY" | "ZOOM_REFLOW" | "REDUCED_MOTION";
export interface AccessibilityMatrixEntry { readonly matrixId: string; readonly surface: AccessibilitySurface; readonly browser: "SAFARI" | "CHROME" | "FIREFOX" | "EDGE"; readonly platform: "IOS" | "ANDROID" | "MACOS" | "WINDOWS"; readonly assistiveTechnology: AssistiveTechnology; readonly minimumVersionPolicy: "CURRENT_AND_PREVIOUS"; readonly deviceLabRef: string | null; readonly configured: false }

export const usedCarsStagingAccessibilityMatrix: readonly AccessibilityMatrixEntry[] = Object.freeze([
  { matrixId: "A11Y-M01", surface: "B2C_MOBILE", browser: "SAFARI", platform: "IOS", assistiveTechnology: "VOICEOVER_IOS", minimumVersionPolicy: "CURRENT_AND_PREVIOUS", deviceLabRef: null, configured: false },
  { matrixId: "A11Y-M02", surface: "B2C_MOBILE", browser: "CHROME", platform: "ANDROID", assistiveTechnology: "TALKBACK_ANDROID", minimumVersionPolicy: "CURRENT_AND_PREVIOUS", deviceLabRef: null, configured: false },
  { matrixId: "A11Y-M03", surface: "B2C_DESKTOP", browser: "CHROME", platform: "WINDOWS", assistiveTechnology: "NVDA_WINDOWS", minimumVersionPolicy: "CURRENT_AND_PREVIOUS", deviceLabRef: null, configured: false },
  { matrixId: "A11Y-M04", surface: "B2C_DESKTOP", browser: "SAFARI", platform: "MACOS", assistiveTechnology: "VOICEOVER_MACOS", minimumVersionPolicy: "CURRENT_AND_PREVIOUS", deviceLabRef: null, configured: false },
  { matrixId: "A11Y-M05", surface: "PARTNER_DESKTOP", browser: "EDGE", platform: "WINDOWS", assistiveTechnology: "NVDA_WINDOWS", minimumVersionPolicy: "CURRENT_AND_PREVIOUS", deviceLabRef: null, configured: false },
  { matrixId: "A11Y-M06", surface: "OPS_DESKTOP", browser: "FIREFOX", platform: "WINDOWS", assistiveTechnology: "NVDA_WINDOWS", minimumVersionPolicy: "CURRENT_AND_PREVIOUS", deviceLabRef: null, configured: false },
  { matrixId: "A11Y-M07", surface: "PARTNER_DESKTOP", browser: "CHROME", platform: "MACOS", assistiveTechnology: "KEYBOARD_ONLY", minimumVersionPolicy: "CURRENT_AND_PREVIOUS", deviceLabRef: null, configured: false },
  { matrixId: "A11Y-M08", surface: "B2C_DESKTOP", browser: "CHROME", platform: "WINDOWS", assistiveTechnology: "ZOOM_REFLOW", minimumVersionPolicy: "CURRENT_AND_PREVIOUS", deviceLabRef: null, configured: false },
  { matrixId: "A11Y-M09", surface: "B2C_MOBILE", browser: "SAFARI", platform: "IOS", assistiveTechnology: "REDUCED_MOTION", minimumVersionPolicy: "CURRENT_AND_PREVIOUS", deviceLabRef: null, configured: false },
]);

export function validateAccessibilityMatrixManifest(entries: readonly AccessibilityMatrixEntry[]) {
  const codes: string[] = [];
  const surfaces: readonly AccessibilitySurface[] = ["B2C_MOBILE", "B2C_DESKTOP", "PARTNER_DESKTOP", "OPS_DESKTOP"];
  if (new Set(entries.map((item) => item.matrixId)).size !== entries.length) codes.push("DUPLICATE_MATRIX_ID");
  for (const surface of surfaces) if (!entries.some((item) => item.surface === surface)) codes.push(`SURFACE_REQUIRED:${surface}`);
  for (const technology of ["VOICEOVER_IOS", "TALKBACK_ANDROID", "NVDA_WINDOWS", "KEYBOARD_ONLY", "ZOOM_REFLOW", "REDUCED_MOTION"] as const) if (!entries.some((item) => item.assistiveTechnology === technology)) codes.push(`ASSISTIVE_TECH_REQUIRED:${technology}`);
  if (entries.some((item) => item.deviceLabRef || item.configured)) codes.push("DEVICE_LAB_ENABLEMENT_FORBIDDEN");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), deviceLabExecutionAuthorized: false as const });
}
