import type { ConversationEvent } from "../domain/conversationEvent";
import type { PersistedGovernedOffer } from "../offer/types";
import type { PersistedOfferTransitionIntent, StoredV2Conversation, V2ConversationStore } from "./types";
export class InMemoryV2ConversationStore implements V2ConversationStore {
  private readonly records = new Map<string, StoredV2Conversation>(); private readonly offers = new Map<string, PersistedGovernedOffer>(); private readonly events = new Map<string, ConversationEvent[]>();
  async load(id: string) { const value = this.records.get(id); return value ? structuredClone(value) : null; }
  async getOffer(id: string) { const value = this.offers.get(id); return value ? structuredClone(value) : null; }
  async getEvents(conversationId: string) { return structuredClone(this.events.get(conversationId) ?? []); }
  async commit(input: { expectedRevision: number; next: StoredV2Conversation; events?: readonly ConversationEvent[]; offer?: PersistedGovernedOffer; offerTransition?: PersistedOfferTransitionIntent }) {
    const current = this.records.get(input.next.conversationId); if ((current?.revision ?? 0) !== input.expectedRevision) return { status: "REVISION_CONFLICT" as const };
    const nextOffers = new Map(this.offers); if (input.offer) nextOffers.set(input.offer.offerId, structuredClone(input.offer));
    if (input.offerTransition) { const found = nextOffers.get(input.offerTransition.offerId); if (found && found.conversationId !== input.offerTransition.conversationId) throw new Error("ATOMIC_OFFER_TRANSITION_FAILED"); if (found && input.offerTransition.to === "REVEALED") { if (found.lifecycleState !== "CREATED" || !(Date.parse(input.offerTransition.acceptedAt) < Date.parse(input.offerTransition.revealedAt))) throw new Error("ATOMIC_OFFER_TRANSITION_FAILED"); nextOffers.set(found.offerId, { ...found, lifecycleState: "REVEALED", consentedAt: input.offerTransition.acceptedAt, revealedAt: input.offerTransition.revealedAt }); } else if (found) nextOffers.set(found.offerId, { ...found, lifecycleState: "REVOKED" }); }
    this.records.set(input.next.conversationId, structuredClone(input.next)); this.offers.clear(); for (const [key, value] of nextOffers) this.offers.set(key, value); this.events.set(input.next.conversationId, [...(this.events.get(input.next.conversationId) ?? []), ...(input.events ?? [])].map((event) => structuredClone(event))); return { status: "OK" as const };
  }
}
