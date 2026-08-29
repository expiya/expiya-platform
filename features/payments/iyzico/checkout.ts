import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type { IyzicoHttpClient } from "./httpClient";

const phonePattern = /^\+90\d{10}$/u;
const identityNumberPattern = /^\d{10,11}$/u;

export const iyzicoBuyerSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  surname: z.string().trim().min(1).max(80),
  identityNumber: z.string().regex(identityNumberPattern),
  email: z.string().trim().email().max(254),
  gsmNumber: z.string().regex(phonePattern),
  billingAddress: z.strictObject({
    address: z.string().trim().min(5).max(500),
    city: z.string().trim().min(2).max(100),
    zipCode: z.string().trim().min(5).max(10).optional(),
  }),
});

export type IyzicoBuyerInput = z.infer<typeof iyzicoBuyerSchema>;

export interface IyzicoCheckoutInitializeResult {
  readonly status: "success";
  readonly conversationId: string;
  readonly token: string;
  readonly tokenExpireTime?: number;
  readonly paymentPageUrl: string;
  readonly signature: string;
}

export interface IyzicoCheckoutRetrieveResult {
  readonly status: "success";
  readonly paymentStatus: string;
  readonly paymentId: string;
  readonly currency: string;
  readonly basketId: string;
  readonly conversationId: string;
  readonly paidPrice: number;
  readonly price: number;
  readonly token: string;
  readonly signature: string;
}

function decimalTry(amountKurus: number): number {
  if (!Number.isSafeInteger(amountKurus) || amountKurus <= 0) throw new TypeError("PAYMENT_AMOUNT_INVALID");
  return amountKurus / 100;
}

export function verifyIyzicoResponseSignature(secretKey: string, values: readonly (string | number)[], signature: string): boolean {
  if (!/^[a-f\d]{64}$/iu.test(signature)) return false;
  const expected = Buffer.from(createHmac("sha256", secretKey).update(values.join(":"), "utf8").digest("hex"), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function initializeIyzicoCheckout(input: {
  readonly client: IyzicoHttpClient;
  readonly secretKey: string;
  readonly orderId: string;
  readonly quoteId: string;
  readonly amountKurus: number;
  readonly callbackUrl: string;
  readonly buyerIp: string;
  readonly buyer: IyzicoBuyerInput;
}): Promise<IyzicoCheckoutInitializeResult> {
  const buyer = iyzicoBuyerSchema.parse(input.buyer);
  const price = decimalTry(input.amountKurus);
  const result = await input.client.post<IyzicoCheckoutInitializeResult>(
    "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    {
      locale: "tr",
      conversationId: input.orderId,
      price,
      paidPrice: price,
      currency: "TRY",
      basketId: input.quoteId,
      paymentGroup: "PRODUCT",
      paymentChannel: "WEB",
      callbackUrl: input.callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id: input.orderId,
        name: buyer.name,
        surname: buyer.surname,
        identityNumber: buyer.identityNumber,
        email: buyer.email,
        gsmNumber: buyer.gsmNumber,
        registrationAddress: buyer.billingAddress.address,
        city: buyer.billingAddress.city,
        country: "Turkey",
        zipCode: buyer.billingAddress.zipCode,
        ip: input.buyerIp,
      },
      billingAddress: {
        contactName: `${buyer.name} ${buyer.surname}`,
        address: buyer.billingAddress.address,
        city: buyer.billingAddress.city,
        country: "Turkey",
        zipCode: buyer.billingAddress.zipCode,
      },
      basketItems: [{
        id: input.quoteId,
        name: "Expiya Cars 3 Araç Karar Doğrulama Raporu",
        category1: "Dijital İçerik",
        itemType: "VIRTUAL",
        price,
      }],
    },
  );
  if (!result.token || !result.paymentPageUrl || result.conversationId !== input.orderId) throw new TypeError("IYZICO_INITIALIZE_BINDING_INVALID");
  if (!verifyIyzicoResponseSignature(input.secretKey, [result.conversationId, result.token], result.signature)) {
    throw new TypeError("IYZICO_INITIALIZE_SIGNATURE_INVALID");
  }
  return result;
}

export async function retrieveIyzicoCheckout(input: {
  readonly client: IyzicoHttpClient;
  readonly secretKey: string;
  readonly orderId: string;
  readonly token: string;
  readonly quoteId: string;
  readonly expectedAmountKurus: number;
}): Promise<IyzicoCheckoutRetrieveResult> {
  const result = await input.client.post<IyzicoCheckoutRetrieveResult>(
    "/payment/iyzipos/checkoutform/auth/ecom/detail",
    { locale: "tr", conversationId: input.orderId, token: input.token },
  );
  const signedValues = [result.paymentStatus, result.paymentId, result.currency, result.basketId,
    result.conversationId, result.paidPrice, result.price, result.token] as const;
  if (!verifyIyzicoResponseSignature(input.secretKey, signedValues, result.signature)) throw new TypeError("IYZICO_RETRIEVE_SIGNATURE_INVALID");
  const expected = decimalTry(input.expectedAmountKurus);
  if (result.paymentStatus !== "SUCCESS"
    || result.conversationId !== input.orderId
    || result.basketId !== input.quoteId
    || result.token !== input.token
    || result.currency !== "TRY"
    || result.price !== expected
    || result.paidPrice !== expected) {
    throw new TypeError("IYZICO_RETRIEVE_BINDING_INVALID");
  }
  return result;
}
