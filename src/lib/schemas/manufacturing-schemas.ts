import { z } from "zod";

export const workOrderSchema = z.object({
  production_item: z.string().min(1, "Production item is required"),
  bom_no: z.string().min(1, "BOM is required"),
  qty: z.coerce.number().min(1, "Quantity must be at least 1"),
  company: z.string().min(1, "Company is required"),
  planned_start_date: z.string().min(1, "Start date is required"),
  expected_delivery_date: z.string().optional(),
  fg_warehouse: z.string().optional(),
  wip_warehouse: z.string().optional(),
  source_warehouse: z.string().optional(),
});

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

export const bomItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  qty: z.coerce.number().min(0.001, "Quantity must be greater than 0"),
  rate: z.coerce.number().min(0),
  stock_uom: z.string().optional(),
  source_warehouse: z.string().optional(),
});

export const bomOperationSchema = z.object({
  operation: z.string().min(1, "Operation is required"),
  workstation: z.string().optional(),
  time_in_mins: z.coerce.number().min(0),
  batch_size: z.coerce.number().min(1).optional(),
});

export const bomSchema = z.object({
  item: z.string().min(1, "Item is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  items: z.array(bomItemSchema).min(1, "At least one material is required"),
  operations: z.array(bomOperationSchema).optional(),
});

export type BOMFormValues = z.infer<typeof bomSchema>;

export const quickManufactureSchema = z.object({
  qty: z.coerce.number().min(0.001, "Quantity must be greater than 0"),
});

export type QuickManufactureFormValues = z.infer<typeof quickManufactureSchema>;
