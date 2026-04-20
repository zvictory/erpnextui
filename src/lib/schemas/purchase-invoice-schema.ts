import { z } from "zod";

// Sanity ceiling on a single line total (qty × rate). Catches obvious
// data-entry errors where an ID/balance gets pasted into the rate field.
// 10B is intentionally generous — it accommodates capital purchases in UZS
// while still flagging pastes of multi-billion values.
const MAX_LINE_TOTAL = 10_000_000_000;

const invoiceItemSchema = z
  .object({
    item_code: z.string().optional(),
    item_name: z.string().optional(),
    expense_account: z.string().optional(),
    description: z.string().optional(),
    qty: z.number().refine((v) => v !== 0, "Qty must not be zero"),
    rate: z.number().min(0, "Rate must be >= 0"),
    amount: z.number(),
    uom: z.string().optional(),
    conversion_factor: z.number().optional(),
    discount_percentage: z.number().min(0).max(100).optional(),
    discount_amount: z.number().min(0).optional(),
  })
  .refine((d) => !!d.item_code || !!d.expense_account, {
    message: "Either item or expense account is required",
    path: ["item_code"],
  })
  .refine(
    (d) => {
      const lineTotal = Math.abs((d.qty || 0) * (d.rate || 0));
      return lineTotal <= MAX_LINE_TOTAL;
    },
    {
      message: "Line total exceeds 10 billion — verify rate and qty are correct",
      path: ["rate"],
    },
  );

export const purchaseInvoiceSchema = z.object({
  supplier: z.string().min(1, "Supplier is required"),
  posting_date: z.string().min(1, "Posting date is required"),
  due_date: z.string().min(1, "Due date is required"),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export type PurchaseInvoiceFormValues = z.infer<typeof purchaseInvoiceSchema>;
