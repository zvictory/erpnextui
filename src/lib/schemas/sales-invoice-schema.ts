import { z } from "zod";
import { format, parse, isValid } from "date-fns";

/** Accepts a date string, normalizes to YYYY-MM-DD for the API. */
function toISODate(val: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

  const parsed = parse(val, "dd/MM/yyyy", new Date());
  if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");

  return val;
}

const isoDateString = (label: string) =>
  z.string().min(1, `${label} is required`).transform(toISODate);

const invoiceItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  qty: z.number().refine((v) => v !== 0, "Qty must not be zero"),
  rate: z.number().min(0, "Rate must be >= 0"),
  amount: z.number(),
  uom: z.string().optional(),
  conversion_factor: z.number().optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_amount: z.number().min(0).optional(),
});

export const salesInvoiceSchema = z
  .object({
    customer: z.string().min(1, "Customer is required"),
    posting_date: isoDateString("Posting date"),
    due_date: isoDateString("Due date"),
    items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  })
  .refine((data) => data.due_date >= data.posting_date, {
    message: "Due date must be on or after posting date",
    path: ["due_date"],
  });

export type SalesInvoiceFormValues = z.infer<typeof salesInvoiceSchema>;

/** Flat items type for API submission. */
export interface SalesInvoiceSubmitValues {
  customer: string;
  posting_date: string;
  due_date: string;
  currency?: string;
  items: Array<{
    item_code: string;
    qty: number;
    rate?: number;
    amount?: number;
    price_list_rate?: number;
    uom?: string;
    conversion_factor?: number;
    discount_percentage?: number;
    discount_amount?: number;
  }>;
}
