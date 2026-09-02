import "server-only";

import { z } from "zod";

import {
  PAID_COMPARISON_CURRENCY,
  PAID_COMPARISON_NET_KURUS,
  PAID_COMPARISON_PRICE_KURUS,
  PAID_COMPARISON_PRODUCT_CODE,
  PAID_COMPARISON_VAT_KURUS,
  PAID_COMPARISON_VAT_RATE_PERCENT,
} from "@/features/paid-comparison/contracts";
import type { IsbasiHttpClient, IsbasiSession } from "./httpClient";

const identityPattern = /^\d{10,11}$/u;
const phonePattern = /^\+90\d{10}$/u;

export const isbasiInvoiceCustomerSchema = z.strictObject({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  identityNumber: z.string().regex(identityPattern),
  email: z.string().trim().email().max(254),
  phone: z.string().regex(phonePattern),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(100),
  district: z.string().trim().min(1).max(100),
  taxOffice: z.string().trim().max(100).optional(),
});

export type IsbasiInvoiceCustomer = z.infer<typeof isbasiInvoiceCustomerSchema>;

function tryAmount(kurus: number): number {
  return Number((kurus / 100).toFixed(2));
}

export function buildPaidComparisonIsbasiInvoice(input: {
  readonly orderId: string;
  readonly paidAt: Date;
  readonly customer: IsbasiInvoiceCustomer;
}) {
  if (!/^[0-9a-f-]{36}$/iu.test(input.orderId)) throw new TypeError("ISBASI_ORDER_ID_INVALID");
  const customer = isbasiInvoiceCustomerSchema.parse(input.customer);
  const gross = tryAmount(PAID_COMPARISON_PRICE_KURUS);
  const net = tryAmount(PAID_COMPARISON_NET_KURUS);
  const vat = tryAmount(PAID_COMPARISON_VAT_KURUS);
  if (Number((net + vat).toFixed(2)) !== gross) throw new TypeError("ISBASI_INVOICE_TOTAL_INVALID");

  return {
    invoiceId: 0,
    customer: {
      id: 0,
      isPerson: customer.identityNumber.length === 11,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: `${customer.firstName} ${customer.lastName}`,
      tcknVkn: customer.identityNumber,
      taxOffice: customer.taxOffice,
      emailAddress: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      district: customer.district,
      country: "Türkiye",
    },
    invoiceDate: input.paidAt.toISOString(),
    currency: PAID_COMPARISON_CURRENCY === "TRY" ? "TL" : PAID_COMPARISON_CURRENCY,
    exchangeRate: 1,
    description: `Expiya Cars karar doğrulama raporu - ${input.orderId}`,
    categoryName: "Dijital Hizmet",
    deliveryAddressDifferent: false,
    vatIncluded: false,
    salesInvoiceDetails: [{
      quantity: 1,
      taxRate: PAID_COMPARISON_VAT_RATE_PERCENT,
      price: net,
      description: `KDV ${vat.toFixed(2)} TL; toplam ${gross.toFixed(2)} TL`,
      discountRate: 0,
      discountValue: 0,
      productDetail: {
        itemCode: PAID_COMPARISON_PRODUCT_CODE,
        itemType: 2,
        name: "Expiya Cars 3 Araç Karar Doğrulama Raporu",
        vat: PAID_COMPARISON_VAT_RATE_PERCENT,
        unit: "Adet",
      },
    }],
  } as const;
}

interface IsbasiInvoiceResponse {
  readonly code?: number;
  readonly isError?: boolean;
  readonly data?: { readonly invoiceId?: string };
}

export async function createPaidComparisonIsbasiInvoice(input: {
  readonly client: IsbasiHttpClient;
  readonly session: IsbasiSession;
  readonly orderId: string;
  readonly paidAt: Date;
  readonly customer: IsbasiInvoiceCustomer;
}) {
  const result = await input.client.postAuthenticated<IsbasiInvoiceResponse>(
    "/api/v1.0/invoices/integrationInvoices",
    buildPaidComparisonIsbasiInvoice(input),
    input.session,
  );
  const invoiceId = result.data?.invoiceId?.trim();
  if (result.isError === true || !invoiceId) throw new Error("ISBASI_INVOICE_RESPONSE_INVALID");
  return { invoiceId } as const;
}
