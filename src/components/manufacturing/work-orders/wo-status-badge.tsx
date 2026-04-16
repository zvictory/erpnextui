"use client";

import { Badge } from "@/components/ui/badge";
import type { WorkOrderStatus } from "@/types/manufacturing";

const statusConfig: Record<
  WorkOrderStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  Draft: { variant: "outline" },
  "Not Started": { variant: "secondary" },
  "In Process": { variant: "default" },
  Completed: { variant: "default", className: "bg-green-600 hover:bg-green-700" },
  Stopped: { variant: "destructive" },
  Cancelled: { variant: "outline" },
};

interface WoStatusBadgeProps {
  status: WorkOrderStatus;
}

export function WoStatusBadge({ status }: WoStatusBadgeProps) {
  const config = statusConfig[status] ?? { variant: "outline" as const };
  return (
    <Badge variant={config.variant} className={config.className}>
      {status}
    </Badge>
  );
}
