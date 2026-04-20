import { z } from "zod/v4";

export const setupSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .check((ctx) => {
    if (ctx.value.password !== ctx.value.confirmPassword) {
      ctx.issues.push({
        code: "custom",
        message: "Passwords do not match",
        input: ctx.value.confirmPassword,
        path: ["confirmPassword"],
      });
    }
  });

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .check((ctx) => {
    if (ctx.value.newPassword !== ctx.value.confirmPassword) {
      ctx.issues.push({
        code: "custom",
        message: "Passwords do not match",
        input: ctx.value.confirmPassword,
        path: ["confirmPassword"],
      });
    }
  });

export const tenantSchema = z.object({
  id: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  name: z.string().min(1, "Display name is required"),
  url: z.url("Must be a valid URL"),
  apiKey: z.string().min(1, "API key is required"),
  enabled: z.boolean().default(true),
  enabledModuleGroups: z.array(z.string()).optional(),
});

export const tenantUpdateSchema = tenantSchema.partial().omit({ id: true });

export const platformSettingsSchema = z.object({
  appName: z.string().min(1, "App name is required").optional(),
  tenantCacheTtlMs: z.number().int().min(0).optional(),
  provisioningApiUrl: z.string().url().optional().or(z.literal("")),
  provisioningApiKey: z.string().optional(),
  provisioningApiSecret: z.string().optional(),
});

export const registrationSchema = z
  .object({
    companyName: z.string().min(1, "Название компании обязательно"),
    email: z.email("Некорректный email"),
    password: z.string().min(8, "Пароль должен содержать не менее 8 символов"),
    confirmPassword: z.string(),
    phone: z.string().min(5, "Номер телефона обязателен"),
    country: z.string().min(1, "Страна обязательна"),
    currency: z.string().min(1, "Валюта обязательна"),
    plan: z.enum(["starter", "pro", "enterprise"]).optional(),
    referralCode: z.string().max(20).optional(),
  })
  .check((ctx) => {
    if (ctx.value.password !== ctx.value.confirmPassword) {
      ctx.issues.push({
        code: "custom",
        message: "Пароли не совпадают",
        input: ctx.value.confirmPassword,
        path: ["confirmPassword"],
      });
    }
  });

export const registrationActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectReason: z.string().optional(),
});

export type SetupInput = z.infer<typeof setupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TenantInput = z.infer<typeof tenantSchema>;
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;
export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type RegistrationActionInput = z.infer<typeof registrationActionSchema>;
