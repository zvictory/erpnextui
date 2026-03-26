import { z } from "zod";

export const customerSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_type: z.enum(["Company", "Individual"]),
  customer_group: z.string(),
  territory: z.string(),
  default_currency: z.string(),
  tax_id: z.string(),
  email_id: z.string(),
  mobile_no: z.string(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
