import { z } from "zod";

export const bankAccountSchema = z.object({
  account_name: z.string().min(1, "Account name is required"),
  parent_account: z.string().min(1, "Parent account is required"),
  account_currency: z.string().min(1, "Currency is required"),
  bank_account_no: z.string().optional(),
});

export const generalAccountSchema = z.object({
  account_name: z.string().min(1, "Account name is required"),
  parent_account: z.string().min(1, "Parent account is required"),
  account_currency: z.string().min(1, "Currency is required"),
  account_type: z.string().min(1, "Account type is required"),
  is_group: z.boolean().default(false),
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;
export type GeneralAccountFormValues = z.infer<typeof generalAccountSchema>;
