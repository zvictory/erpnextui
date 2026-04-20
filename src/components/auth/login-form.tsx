"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FrappeAPIError } from "@/lib/frappe-types";

interface TenantMatch {
  name: string;
  siteUrl: string;
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [matchedTenants, setMatchedTenants] = useState<TenantMatch[] | null>(null);
  const [selectedSiteUrl, setSelectedSiteUrl] = useState<string | null>(null);
  const loginMutation = useLogin();

  const isBusy = isResolving || loginMutation.isPending;

  const errorMessage = resolveError
    ? resolveError
    : loginMutation.error
      ? loginMutation.error instanceof FrappeAPIError
        ? (loginMutation.error.serverMessages?.[0] ?? loginMutation.error.message)
        : t("signIn.unexpectedError")
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    setResolveError(null);
    loginMutation.reset();
    setIsResolving(true);

    try {
      const resp = await fetch("/api/resolve-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setResolveError((data as { error?: string }).error || t("signIn.accountNotFound"));
        return;
      }

      const { tenants } = (await resp.json()) as { tenants: TenantMatch[] };

      if (tenants.length === 1) {
        // Single tenant — auto-login (unchanged UX)
        loginMutation.mutate(
          { siteUrl: tenants[0].siteUrl, usr: trimmedEmail, pwd: password },
          { onSuccess: () => router.replace("/dashboard") },
        );
      } else {
        // Multiple tenants — show selector
        setMatchedTenants(tenants);
        setSelectedSiteUrl(tenants[0].siteUrl);
      }
    } catch {
      setResolveError(t("signIn.networkError"));
    } finally {
      setIsResolving(false);
    }
  }

  function handleTenantConfirm() {
    if (!selectedSiteUrl) return;
    loginMutation.mutate(
      { siteUrl: selectedSiteUrl, usr: email.trim(), pwd: password },
      { onSuccess: () => router.replace("/dashboard") },
    );
  }

  // Tenant selector view
  if (matchedTenants && matchedTenants.length > 1) {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("signIn.selectCompany")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("signIn.multipleCompanies")}</p>

        <div className="mt-6 flex flex-col gap-2">
          {matchedTenants.map((tenant) => (
            <button
              key={tenant.siteUrl}
              type="button"
              onClick={() => setSelectedSiteUrl(tenant.siteUrl)}
              disabled={loginMutation.isPending}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                selectedSiteUrl === tenant.siteUrl
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              } disabled:opacity-50`}
            >
              {tenant.name}
            </button>
          ))}
        </div>

        {errorMessage && <p className="mt-4 text-sm text-destructive">{errorMessage}</p>}

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setMatchedTenants(null);
              setSelectedSiteUrl(null);
              loginMutation.reset();
            }}
            disabled={loginMutation.isPending}
          >
            {t("signIn.back")}
          </Button>
          <Button
            className="flex-1"
            onClick={handleTenantConfirm}
            disabled={!selectedSiteUrl || loginMutation.isPending}
          >
            {loginMutation.isPending ? t("signIn.signingIn") : t("signIn.continue")}
          </Button>
        </div>
      </div>
    );
  }

  // Credentials view (default)
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{t("signIn.title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("signIn.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setResolveError(null);
              setMatchedTenants(null);
            }}
            autoComplete="username"
            autoFocus
            disabled={isBusy}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t("signIn.password")}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t("signIn.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isBusy}
          />
        </div>
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <Button
          type="submit"
          className="mt-2 w-full"
          disabled={isBusy || !email.trim() || !password.trim()}
        >
          {isResolving
            ? t("signIn.searching")
            : loginMutation.isPending
              ? t("signIn.signingIn")
              : t("signIn.signInButton")}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("signIn.noAccount")}{" "}
        <Link
          href="/register"
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {t("signIn.register")}
        </Link>
      </p>
    </div>
  );
}
