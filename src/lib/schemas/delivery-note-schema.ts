import { z } from "zod";

const deliveryNoteItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  qty: z.number().min(0.001, "Qty must be > 0"),
  rate: z.number().min(0, "Rate must be >= 0"),
  amount: z.number(),
  warehouse: z.string().optional(),
  against_sales_order: z.string().optional(),
  so_detail: z.string().optional(),
});

export const deliveryNoteSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  posting_date: z.string().min(1, "Date is required"),
  items: z.array(deliveryNoteItemSchema).min(1, "At least one item is required"),
});

export type DeliveryNoteFormValues = z.infer<typeof deliveryNoteSchema>;
