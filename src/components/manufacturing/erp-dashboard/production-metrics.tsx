"use client";

import { useTranslations } from "next-intl";
import { Activity, Clock, CheckCircle, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsData {
  active: number;
  pending: number;
  completed: number;
}

interface ProductionMetricsProps {
  data: MetricsData | undefined;
  isLoading: boolean;
}

export function ProductionMetrics({ data, isLoading }: ProductionMetricsProps) {
  const t = useTranslations("mfg.dashboard");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const total = data.active + data.pending + data.completed;
  const efficiency = total > 0 ? Math.round((data.completed / total) * 100) : 0;

  const cards = [
    {
      label: t("activeWOs"),
      value: data.active,
      icon: Activity,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: t("pendingWOs"),
      value: data.pending,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: t("completedToday"),
      value: data.completed,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: t("efficiency"),
      value: `${efficiency}%`,
      icon: Gauge,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <div className={`rounded-md p-2 ${card.bg}`}>
              <card.icon className={`size-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
