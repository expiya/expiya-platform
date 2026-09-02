import { describe, expect, it, vi } from "vitest";

import { buildPaidComparisonIsbasiInvoice, createPaidComparisonIsbasiInvoice } from "./invoice";

const input = {
  orderId: "123e4567-e89b-12d3-a456-426614174000",
  paidAt: new Date("2026-09-02T10:00:00.000Z"),
  customer: {
    firstName: "Test",
    lastName: "Kullanıcı",
    identityNumber: "11111111111",
    email: "test@example.com",
    phone: "+905551112233",
    address: "Test Mahallesi 1",
    city: "İstanbul",
    district: "Kadıköy",
  },
};

describe("İşbaşı paid comparison invoice", () => {
  it("pins the product, currency and tax-inclusive total to the server contract", () => {
    const invoice = buildPaidComparisonIsbasiInvoice(input);
    expect(invoice.invoiceId).toBe(0);
    expect(invoice.currency).toBe("TL");
    expect(invoice.salesInvoiceDetails).toEqual([expect.objectContaining({ quantity: 1, price: 290.83, taxRate: 20 })]);
    expect(invoice.salesInvoiceDetails[0].description).toContain("toplam 349.00 TL");
  });

  it("uses only the documented invoice endpoint and requires a provider invoice id", async () => {
    const postAuthenticated = vi.fn().mockResolvedValue({ code: 200, isError: false, data: { invoiceId: "invoice-1" } });
    await expect(createPaidComparisonIsbasiInvoice({ ...input, client: { login: vi.fn(), postAuthenticated }, session: { accessToken: "token", tenantId: "tenant" } })).resolves.toEqual({ invoiceId: "invoice-1" });
    expect(postAuthenticated).toHaveBeenCalledWith("/api/v1.0/invoices/integrationInvoices", expect.objectContaining({ invoiceId: 0 }), expect.anything());

    postAuthenticated.mockResolvedValueOnce({ code: 200, isError: false, data: {} });
    await expect(createPaidComparisonIsbasiInvoice({ ...input, client: { login: vi.fn(), postAuthenticated }, session: { accessToken: "token", tenantId: "tenant" } })).rejects.toThrow("ISBASI_INVOICE_RESPONSE_INVALID");
  });
});
