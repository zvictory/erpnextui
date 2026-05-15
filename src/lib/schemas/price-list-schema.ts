import { z } from "zod";

export const priceListSchema = z.object({
  price_list_name: z.string().min(1, "Price list name is required"),
  currency: z.string().min(1, "Currency is required"),
  selling: z.boolean(),
  buying: z.boolean(),
  enabled: z.boolean(),
});

export type PriceListFormValues = z.infer<typeof priceListSchema>;

export const itemPriceSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  price_list_rate: z.number().min(0, "Rate must be >= 0"),
  currency: z.string(),
  uom: z.string(),
  min_qty: z.number().optional(),
  valid_from: z.string().optional(),
  valid_upto: z.string().optional(),
  customer: z.string().optional(),
  supplier: z.string().optional(),
  batch_no: z.string().optional(),
  packing_unit: z.number().optional(),
});

export type ItemPriceFormValues = z.infer<typeof itemPriceSchema>;

export const bulkUpdateSchema = z.object({
  percentage: z.number().min(0.01, "Percentage must be > 0"),
  direction: z.enum(["increase", "decrease"]),
});

export type BulkUpdateFormValues = z.infer<typeof bulkUpdateSchema>;
