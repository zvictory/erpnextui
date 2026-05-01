import { cn } from "@/lib/utils";

export type KpiTone = "default" | "good" | "warn" | "bad";

const TONES: Record<KpiTone, string> = {
  default:
    "from-zinc-50 to-white ring-zinc-200 dark:from-zinc-800/60 dark:to-zinc-900/40 dark:ring-zinc-800",
  good: "from-emerald-50 to-white ring-emerald-200 dark:from-emerald-500/10 dark:to-zinc-900/40 dark:ring-emerald-500/30",
  warn: "from-amber-50 to-white ring-amber-200 dark:from-amber-500/10 dark:to-zinc-900/40 dark:ring-amber-500/30",
  bad: "from-rose-50 to-white ring-rose-200 dark:from-rose-500/10 dark:to-zinc-900/40 dark:ring-rose-500/30",
};

export function KpiTile({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: KpiTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br p-4 ring-1",
        TONES[tone],
        className,
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">{hint}</div>
      ) : null}
    </div>
  );
}
