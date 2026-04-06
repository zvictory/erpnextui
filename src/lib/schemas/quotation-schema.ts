import { z } from "zod";

const quotationItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  qty: z.number().min(0.001, "Qty must be > 0"),
  rate: z.number().min(0, "Rate must be >= 0"),
  amount: z.number(),
});

export const quotationSchema = z.object({
  party_name: z.string().min(1, "Customer is required"),
  transaction_date: z.string().min(1, "Date is required"),
  valid_till: z.string().min(1, "Valid till date is required"),
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
});

export type QuotationFormValues = z.infer<typeof quotationSchema>;
