"use client";

import { useMutation } from "@tanstack/react-query";

interface RegistrationData {
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  country: string;
  currency: string;
  plan?: string;
  referralCode?: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegistrationData) => {
      const resp = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Registration failed");
      return json as { ok: true };
    },
  });
}
