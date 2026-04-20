import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  Target,
  Package,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { formatNumber } from "@/lib/formatters";

interface KPIData {
  productivity: number;
  efficiency: number;
  totalOutput: number;
  totalUnplannedDowntimeHours: number;
  previous: {
    productivity: number;
    efficiency: number;
    totalOutput: number;
    totalUnplannedDowntimeHours: number;
  } | null;
}

function TrendIndicator({
  current,
  previous,
  invertColor = false,
}: {
  current: number;
  previous: number | undefined;
  invertColor?: boolean;
}) {
  if (previous === undefined || previous === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" />
        No prior data
      </span>
    );
  }

  const diff = current - previous;
  const pctChange = previous > 0 ? formatNumber((diff / previous) * 100, 1) : diff > 0 ? "+" : "0";

  if (Math.abs(diff) < 0.001) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" />
        No change
      </span>
    );
  }

  const isPositive = diff > 0;
  // For downtime, going up is bad (red), going down is good (green)
  const isGood = invertColor ? !isPositive : isPositive;

  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${
        isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isPositive ? "+" : ""}
      {typeof pctChange === "string" ? pctChange : pctChange}% vs prior period
    </span>
  );
}

export function KPICards({ kpis }: { kpis: KPIData }) {
  const cards: Array<{
    title: string;
    value: string;
    subtitle?: string;
    current: number;
    previous: number | undefined;
    invertColor: boolean;
    icon: LucideIcon;
    borderColor: string;
    badgeBg: string;
    iconColor: string;
  }> = [
    {
      title: "Overall Productivity",
      value: `${formatNumber(kpis.productivity * 100, 1)}%`,
      current: kpis.productivity,
      previous: kpis.previous?.productivity,
      invertColor: false,
      icon: Gauge,
      borderColor: "border-l-emerald-500",
      badgeBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Overall Efficiency (OEE)",
      value: `${formatNumber(kpis.efficiency * 100, 1)}%`,
      current: kpis.efficiency,
      previous: kpis.previous?.efficiency,
      invertColor: false,
      icon: Target,
      borderColor: "border-l-blue-500",
      badgeBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Total Output",
      value: formatNumber(kpis.totalOutput),
      subtitle: "pieces",
      current: kpis.totalOutput,
      previous: kpis.previous?.totalOutput,
      invertColor: false,
      icon: Package,
      borderColor: "border-l-amber-500",
      badgeBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Unplanned Downtime",
      value: `${formatNumber(kpis.totalUnplannedDowntimeHours, 1)} hrs`,
      current: kpis.totalUnplannedDowntimeHours,
      previous: kpis.previous?.totalUnplannedDowntimeHours,
      invertColor: true,
      icon: AlertTriangle,
      borderColor: "border-l-rose-500",
      badgeBg: "bg-rose-100 dark:bg-rose-900/30",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={`border-l-4 ${card.borderColor}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-full p-2 ${card.badgeBg}`}>
              <card.icon className={`size-4 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {card.value}
              {card.subtitle && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {card.subtitle}
                </span>
              )}
            </div>
            <div className="mt-1">
              <TrendIndicator
                current={card.current}
                previous={card.previous}
                invertColor={card.invertColor}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
