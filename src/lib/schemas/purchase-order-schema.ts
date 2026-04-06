import { z } from "zod";

const orderItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  qty: z.number().min(0.001, "Qty must be > 0"),
  rate: z.number().min(0, "Rate must be >= 0"),
  amount: z.number(),
});

export const purchaseOrderSchema = z.object({
  supplier: z.string().min(1, "Supplier is required"),
  transaction_date: z.string().min(1, "Date is required"),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
