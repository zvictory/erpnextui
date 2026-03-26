import { z } from "zod";

export const supplierSchema = z.object({
  supplier_name: z.string().min(1, "Supplier name is required"),
  supplier_type: z.enum(["Company", "Individual"]),
  supplier_group: z.string(),
  default_currency: z.string(),
  tax_id: z.string(),
  email_id: z.string(),
  mobile_no: z.string(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
