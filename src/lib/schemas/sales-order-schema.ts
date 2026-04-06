import { z } from "zod";

const orderItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  qty: z.number().min(0.001, "Qty must be > 0"),
  rate: z.number().min(0, "Rate must be >= 0"),
  amount: z.number(),
  uom: z.string().optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_amount: z.number().min(0).optional(),
});

export const salesOrderSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  transaction_date: z.string().min(1, "Date is required"),
  delivery_date: z.string().min(1, "Delivery date is required"),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export type SalesOrderFormValues = z.infer<typeof salesOrderSchema>;

/** Payload sent to the API — form values plus derived currency. */
export interface SalesOrderSubmitValues extends SalesOrderFormValues {
  currency?: string;
}
