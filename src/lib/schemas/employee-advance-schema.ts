import { z } from "zod";

export const employeeAdvanceSchema = z.object({
  employee: z.string().min(1, "Employee is required"),
  posting_date: z.string().min(1, "Posting date is required"),
  advance_amount: z.number().positive("Amount must be positive"),
  purpose: z.string().min(1, "Purpose is required"),
  advance_account: z.string().min(1, "Advance account is required"),
  currency: z.string().optional(),
});

export type EmployeeAdvanceFormValues = z.infer<typeof employeeAdvanceSchema>;
