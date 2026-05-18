"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FrappeAPIError } from "@/lib/frappe-types";

interface TenantMatch {
  name: string;
  siteUrl: string;
  directFetch: boolean;
}

const PHASE_TRANSITION = { type: "spring" as const, stiffness: 240, damping: 28 };

const phaseVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: PHASE_TRANSITION },
  exit: { opacity: 0, x: -24, transition: { duration: 0.18 } },
};

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [matchedTenants, setMatchedTenants] = useState<TenantMatch[] | null>(null);
  const [selectedSiteUrl, setSelectedSiteUrl] = useState<string | null>(null);
  const loginMutation = useLogin();

  const isBusy = isResolving || loginMutation.isPending;
  const tenantPhase = !!matchedTenants && matchedTenants.length > 1;

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
        loginMutation.mutate(
          {
            siteUrl: tenants[0].siteUrl,
            usr: trimmedEmail,
            pwd: password,
            directFetch: tenants[0].directFetch,
          },
          { onSuccess: () => router.replace("/dashboard") },
        );
      } else {
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
    const selected = matchedTenants?.find((t) => t.siteUrl === selectedSiteUrl);
    if (!selected) return;
    loginMutation.mutate(
      {
        siteUrl: selected.siteUrl,
        usr: email.trim(),
        pwd: password,
        directFetch: selected.directFetch,
      },
      { onSuccess: () => router.replace("/dashboard") },
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {tenantPhase && matchedTenants ? (
        <motion.div
          key="tenant"
          variants={phaseVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <h2 className="text-2xl font-bold tracking-tight">{t("signIn.selectCompany")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("signIn.multipleCompanies")}</p>

          <div className="mt-6 flex flex-col gap-2">
            {matchedTenants.map((tenant) => (
              <motion.button
                key={tenant.siteUrl}
                type="button"
                onClick={() => setSelectedSiteUrl(tenant.siteUrl)}
                disabled={loginMutation.isPending}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                  selectedSiteUrl === tenant.siteUrl
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                } disabled:opacity-50`}
              >
                {tenant.name}
              </motion.button>
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
              {!loginMutation.isPending && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="credentials"
          variants={phaseVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <h2 className="text-2xl font-bold tracking-tight">{t("signIn.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("signIn.subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("signIn.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("signIn.emailPlaceholder")}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("signIn.password")}</Label>
                <a
                  href="mailto:support@erpstable.com?subject=Password%20reset"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t("signIn.forgotPassword")}
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("signIn.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isBusy}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("signIn.hidePassword") : t("signIn.showPassword")}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  disabled={isBusy}
                  tabIndex={-1}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={showPassword ? "eye-off" : "eye"}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
            </div>
            {errorMessage && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive"
              >
                {errorMessage}
              </motion.p>
            )}
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={isBusy || !email.trim() || !password.trim()}
            >
              {isResolving ? (
                t("signIn.searching")
              ) : loginMutation.isPending ? (
                t("signIn.signingIn")
              ) : (
                <>
                  {t("signIn.signInButton")}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("signIn.noAccount")}{" "}
            <a
              href="mailto:sales@erpstable.com?subject=Stable%20ERP%20demo"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {t("signIn.register")}
            </a>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
