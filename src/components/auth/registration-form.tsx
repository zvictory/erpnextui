"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRegister } from "@/hooks/use-registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";

const COUNTRIES = [
  { value: "Uzbekistan" },
  { value: "Kazakhstan" },
  { value: "Russia" },
  { value: "Kyrgyzstan" },
  { value: "Tajikistan" },
  { value: "Turkmenistan" },
  { value: "United States" },
  { value: "Other" },
];

const CURRENCIES = ["UZS", "KZT", "RUB", "USD", "EUR"];

export function RegistrationForm() {
  const t = useTranslations("auth");
  const registerMutation = useRegister();
  const [success, setSuccess] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setClientError(null);

    if (password.length < 8) {
      setClientError(t("register.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setClientError(t("register.passwordMismatch"));
      return;
    }

    registerMutation.mutate(
      { companyName, email, password, confirmPassword, phone, country, currency },
      { onSuccess: () => setSuccess(true) },
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10">
          <CheckCircle className="h-6 w-6 text-teal-500" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">{t("register.successTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("register.successMessage")}</p>
        <Link
          href="/login"
          className="mt-6 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {t("register.backToLogin")}
        </Link>
      </div>
    );
  }

  const errorMessage = clientError || (registerMutation.error?.message ?? null);

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{t("register.title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("register.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="companyName">{t("register.companyName")}</Label>
          <Input
            id="companyName"
            placeholder={t("register.companyPlaceholder")}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={registerMutation.isPending}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={registerMutation.isPending}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-password">{t("register.password")}</Label>
            <Input
              id="reg-password"
              type="password"
              placeholder={t("register.passwordPlaceholder")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setClientError(null);
              }}
              autoComplete="new-password"
              disabled={registerMutation.isPending}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reg-confirm">{t("register.confirmPassword")}</Label>
            <Input
              id="reg-confirm"
              type="password"
              placeholder={t("register.confirmPlaceholder")}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setClientError(null);
              }}
              autoComplete="new-password"
              disabled={registerMutation.isPending}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t("register.phone")}</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+998 90 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={registerMutation.isPending}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">{t("register.country")}</Label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={registerMutation.isPending}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t("register.selectCountry")}</option>
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {t(`countries.${c.value}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">{t("register.currency")}</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={registerMutation.isPending}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t("register.selectCurrency")}</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        <Button
          type="submit"
          className="mt-2 w-full"
          disabled={
            registerMutation.isPending ||
            !companyName.trim() ||
            !email.trim() ||
            !password ||
            !confirmPassword ||
            !phone.trim() ||
            !country ||
            !currency
          }
        >
          {registerMutation.isPending ? t("register.submitting") : t("register.submit")}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("register.hasAccount")}{" "}
        <Link
          href="/login"
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {t("register.signIn")}
        </Link>
      </p>
    </div>
  );
}
