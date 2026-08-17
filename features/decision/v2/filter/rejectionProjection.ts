import type { CandidateRejectionEvent } from "../domain/rejection";
import type { ActiveRejectionProjection } from "./types";

export function projectActiveRejections(events: readonly CandidateRejectionEvent[]): ActiveRejectionProjection {
  const unique = [...new Map(events.map((event) => [event.id, event])).values()].sort((a, b) => a.id.localeCompare(b.id));
  return Object.freeze({ rejections: Object.freeze(unique) });
}
