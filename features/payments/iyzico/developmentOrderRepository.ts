import type { PaidComparisonLegalAcceptance } from "@/features/paid-comparison/legalArtifacts";
import { findDevelopmentPaidComparisonQuote } from "@/features/paid-comparison/repository";
import type { PaidReportStatus } from "@/features/paid-comparison/statusRepository";
import type { CheckoutOrderContext, IyzicoOrderRepository } from "./orderRepository";
import type { ComparisonReportQuote } from "@/features/paid-comparison/contracts";
import { createProductionCatalogReleaseRepository } from "@/features/decision/v2/catalog/fileSystemRepository.server";
import { loadPinnedCatalogSnapshot } from "@/features/decision/v2/catalog/snapshot";
import { buildPaidComparisonReportDraft } from "@/features/paid-comparison/reportDraft";

type DevelopmentOrder = CheckoutOrderContext & {
  status: "CREATED" | "CHECKOUT_INITIALIZED" | "PAYMENT_FAILED" | "PAYMENT_REVIEW_REQUIRED" | "PAID";
  providerToken?: string;
  accessTokenHash?: string;
  reportStatus?: PaidReportStatus;
  reportDocument?: unknown;
  deliveryEmail?: string;
  emailDelivery?: "TEST_MODE" | "QUEUED" | "SENT" | "FAILED";
};

const orders = new Map<string, DevelopmentOrder>();

function assertDevelopment(): void {
  if (process.env.NODE_ENV === "production") throw new TypeError("DEVELOPMENT_PAYMENT_STORE_DISABLED");
}

export class DevelopmentIyzicoOrderRepository implements IyzicoOrderRepository {
  async createFromQuote(input: { readonly orderId: string; readonly quoteId: string; readonly now: Date; readonly legalAcceptance: PaidComparisonLegalAcceptance; readonly subjectHash: string; readonly deliveryEmail?: string }): Promise<CheckoutOrderContext> {
    assertDevelopment();
    const quote = findDevelopmentPaidComparisonQuote(input.quoteId);
    if (!quote || quote.status !== "READY_FOR_CHECKOUT" || Date.parse(quote.expiresAt) <= input.now.getTime()) throw new TypeError("PAID_COMPARISON_QUOTE_NOT_CHECKOUT_READY");
    if (quote.amountKurus !== 34_900 || quote.currency !== "TRY") throw new TypeError("PAID_COMPARISON_QUOTE_PRICE_INVALID");
    const order: DevelopmentOrder = { orderId: input.orderId, quoteId: input.quoteId, amountKurus: quote.amountKurus, currency: "TRY", status: "CREATED", deliveryEmail: input.deliveryEmail };
    orders.set(order.orderId, order);
    return order;
  }

  async markInitialized(input: { readonly orderId: string; readonly token: string; readonly expiresAt: Date }): Promise<void> {
    assertDevelopment();
    const order = orders.get(input.orderId);
    if (!order || order.status !== "CREATED") throw new TypeError("IYZICO_ORDER_INITIALIZE_TRANSITION_INVALID");
    orders.set(input.orderId, { ...order, status: "CHECKOUT_INITIALIZED", providerToken: input.token });
  }

  async markFailed(orderId: string): Promise<void> {
    const order = orders.get(orderId); if (order) orders.set(orderId, { ...order, status: "PAYMENT_FAILED" });
  }

  async markReviewRequired(orderId: string): Promise<void> {
    const order = orders.get(orderId); if (order) orders.set(orderId, { ...order, status: "PAYMENT_REVIEW_REQUIRED" });
  }

  async findPendingByToken(token: string): Promise<CheckoutOrderContext> {
    assertDevelopment();
    const order = [...orders.values()].find((item) => item.providerToken === token && item.status === "CHECKOUT_INITIALIZED");
    if (!order) throw new TypeError("IYZICO_PENDING_ORDER_NOT_FOUND");
    return order;
  }

  async markPaidAndQueue(input: { readonly orderId: string; readonly paymentId: string; readonly jobId: string; readonly now: Date }): Promise<void> {
    const order = orders.get(input.orderId);
    if (!order || order.status !== "CHECKOUT_INITIALIZED") throw new TypeError("IYZICO_ORDER_PAID_TRANSITION_INVALID");
    orders.set(input.orderId, { ...order, status: "PAID", reportStatus: "QUEUED" });
  }

  async grantReportAccess(input: { readonly orderId: string; readonly tokenHash: string }): Promise<void> {
    const order = orders.get(input.orderId);
    if (!order || order.status !== "PAID") throw new TypeError("PAID_REPORT_ACCESS_GRANT_INVALID");
    orders.set(input.orderId, { ...order, accessTokenHash: input.tokenHash });
  }

  static hasPendingToken(token: string): boolean {
    return process.env.NODE_ENV !== "production" && [...orders.values()].some((item) => item.providerToken === token && item.status === "CHECKOUT_INITIALIZED");
  }

  static findStatus(accessTokenHash: string): { status: PaidReportStatus; emailDelivery?: DevelopmentOrder["emailDelivery"]; maskedEmail?: string } | undefined {
    const order = [...orders.values()].find((item) => item.accessTokenHash === accessTokenHash && item.status === "PAID");
    return order?.reportStatus ? { status: order.reportStatus, emailDelivery: order.emailDelivery, maskedEmail: maskEmail(order.deliveryEmail) } : undefined;
  }

  static async processQueuedReport(
    accessTokenHash: string,
    generate: (quote: ComparisonReportQuote) => Promise<unknown> = generateDevelopmentReport,
  ): Promise<{ status: PaidReportStatus; emailDelivery?: DevelopmentOrder["emailDelivery"]; maskedEmail?: string } | undefined> {
    assertDevelopment();
    const order = [...orders.values()].find((item) => item.accessTokenHash === accessTokenHash && item.status === "PAID");
    if (!order?.reportStatus) return undefined;
    if (order.reportStatus !== "QUEUED") return { status: order.reportStatus, emailDelivery: order.emailDelivery, maskedEmail: maskEmail(order.deliveryEmail) };
    const quote = findDevelopmentPaidComparisonQuote(order.quoteId);
    if (!quote) { orders.set(order.orderId, { ...order, reportStatus: "FAILED" }); return { status: "FAILED" }; }
    orders.set(order.orderId, { ...order, reportStatus: "RUNNING" });
    try {
      const document = await generate(quote);
      orders.set(order.orderId, { ...order, reportStatus: "READY", reportDocument: document, emailDelivery: order.deliveryEmail ? "TEST_MODE" : undefined });
      return { status: "READY", emailDelivery: order.deliveryEmail ? "TEST_MODE" : undefined, maskedEmail: maskEmail(order.deliveryEmail) };
    } catch {
      orders.set(order.orderId, { ...order, reportStatus: "FAILED" });
      return { status: "FAILED" };
    }
  }

  static findReportDocument(accessTokenHash: string): unknown | undefined {
    const order = [...orders.values()].find((item) => item.accessTokenHash === accessTokenHash && item.status === "PAID" && item.reportStatus === "READY");
    return order?.reportDocument;
  }

  static findUnlockedVehicleContext(accessTokenHash: string, exactVariantId: string): { catalogRelease: string; catalogFingerprint: string; bodyStyle: string } | undefined {
    const document = this.findReportDocument(accessTokenHash) as { catalogReleaseVersion?: unknown; catalogFingerprint?: unknown; vehicles?: { exactVariantId?: unknown; facts?: Record<string, { value?: unknown; missing?: unknown }> }[] } | undefined;
    const vehicle = document?.vehicles?.find(item => item.exactVariantId === exactVariantId);
    const bodyStyle = vehicle?.facts?.bodyStyle;
    if (typeof document?.catalogReleaseVersion !== "string" || typeof document.catalogFingerprint !== "string" || typeof bodyStyle?.value !== "string" || bodyStyle.missing) return undefined;
    return { catalogRelease: document.catalogReleaseVersion, catalogFingerprint: document.catalogFingerprint, bodyStyle: bodyStyle.value };
  }

  static findUnlockedSalesContext(accessTokenHash: string, exactVariantId: string): { catalogRelease: string; catalogFingerprint: string; approvedNeeds: { concept: string; summary: string; value?: string }[] } | undefined {
    const document = this.findReportDocument(accessTokenHash) as { catalogReleaseVersion?: unknown; catalogFingerprint?: unknown; needsSummary?: unknown; vehicles?: { exactVariantId?: unknown }[] } | undefined;
    if (!document?.vehicles?.some(item => item.exactVariantId === exactVariantId) || typeof document.catalogReleaseVersion !== "string" || typeof document.catalogFingerprint !== "string") return undefined;
    const approvedNeeds = Array.isArray(document.needsSummary) ? document.needsSummary.filter((item): item is { concept: string; summary: string; value?: string } => Boolean(item && typeof item === "object" && typeof (item as { concept?: unknown }).concept === "string" && typeof (item as { summary?: unknown }).summary === "string")) : [];
    return { catalogRelease: document.catalogReleaseVersion, catalogFingerprint: document.catalogFingerprint, approvedNeeds };
  }
}

function maskEmail(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const [local, domain] = value.split("@");
  return local && domain ? `${local.slice(0, 1)}***@${domain}` : undefined;
}

export function resetDevelopmentIyzicoOrdersForTests(): void { orders.clear(); }

async function generateDevelopmentReport(quote: ComparisonReportQuote): Promise<unknown> {
  const loaded = await loadPinnedCatalogSnapshot({ repository: createProductionCatalogReleaseRepository(process.cwd()), releaseVersion: quote.catalogReleaseVersion, catalogFingerprint: quote.catalogFingerprint, now: new Date() });
  if (loaded.status !== "READY") throw new TypeError("PINNED_CATALOG_UNAVAILABLE");
  const variants = quote.vehicles.map((vehicle) => loaded.snapshot.variantById.get(vehicle.exactVariantId));
  const [decision, alternativeOne, alternativeTwo] = variants;
  if (!decision || !alternativeOne || !alternativeTwo) throw new TypeError("PINNED_VARIANT_UNAVAILABLE");
  return buildPaidComparisonReportDraft({ catalogReleaseVersion: quote.catalogReleaseVersion, catalogFingerprint: quote.catalogFingerprint, approvedNeeds: quote.approvedNeeds, generatedAt: new Date().toISOString(), variants: [decision, alternativeOne, alternativeTwo] });
}
