import { z } from "zod";

export const itemSchema = z.object({
  item_code: z.string().min(1, "Item code is required"),
  item_name: z.string().min(1, "Item name is required"),
  item_group: z.string().min(1, "Item group is required"),
  stock_uom: z.string().min(1, "UOM is required"),
  standard_rate: z.number().min(0),
  valuation_rate: z.number().min(0),
  is_stock_item: z.number(),
  has_serial_no: z.number(),
  disabled: z.number(),
});

export type ItemFormValues = z.infer<typeof itemSchema>;
