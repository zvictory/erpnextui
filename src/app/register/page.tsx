"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Scale, Shield, Zap, Globe } from "lucide-react";
import { RegistrationForm } from "@/components/auth/registration-form";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

const features = [
  { icon: Shield, text: "Безопасность корпоративного уровня" },
  { icon: Zap, text: "Высокая производительность" },
  { icon: Globe, text: "Доступ из любой точки мира" },
];

const PLAN_LABELS: Record<string, string> = {
  starter: "Старт",
  pro: "Про",
  enterprise: "Бизнес",
};

function RegisterFormWithPlan() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const referral = searchParams.get("ref");

  return (
    <>
      {plan && PLAN_LABELS[plan] && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-teal-500/20 bg-teal-500/5 px-4 py-2.5">
          <span className="text-sm text-muted-foreground">Выбранный тариф:</span>
          <span className="rounded-full bg-teal-500/10 px-3 py-0.5 text-sm font-medium text-teal-600 dark:text-teal-400">
            {PLAN_LABELS[plan]}
          </span>
        </div>
      )}
      <RegistrationForm plan={plan} referral={referral} />
    </>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left Brand Panel */}
      <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-teal-500/15 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative flex w-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500">
              <Scale className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Stable ERP</span>
          </Link>

          <div>
            <h1 className="text-3xl font-bold leading-tight text-white">
              Начните управлять бизнесом{" "}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                эффективно
              </span>
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-slate-400">
              Финансы, склад, производство, продажи — всё в одной системе. Принимайте решения на
              основе данных в реальном времени.
            </p>
            <div className="mt-8 space-y-4">
              {features.map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                    <f.icon className="h-4 w-4 text-teal-400" />
                  </div>
                  <span className="text-sm text-slate-300">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Stable ERP</p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="relative flex w-full items-center justify-center bg-background p-8 lg:w-1/2">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher variant="outline" />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scale className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold">Stable ERP</span>
            </Link>
          </div>
          <Suspense>
            <RegisterFormWithPlan />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
