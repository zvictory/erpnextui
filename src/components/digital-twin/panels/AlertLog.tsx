"use client";

import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface FactoryAlert {
  id: string;
  timestamp: number;
  severity: "info" | "warning" | "critical";
  equipmentId: string;
  message: string;
  acknowledged: boolean;
}

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", badge: "destructive" as const },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", badge: "secondary" as const },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10", badge: "outline" as const },
};

interface AlertLogProps {
  alerts: FactoryAlert[];
  onAcknowledge?: (id: string) => void;
  className?: string;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AlertLog({ alerts, onAcknowledge, className }: AlertLogProps) {
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);
  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className={className}>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-2">
        {(["all", "critical", "warning", "info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              filter === f
                ? "bg-white/20 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {f === "all" ? `All (${alerts.length})` : f}
          </button>
        ))}
        {unackCount > 0 && (
          <Badge variant="destructive" className="text-[10px] h-4 ml-auto">
            {unackCount}
          </Badge>
        )}
      </div>

      {/* Alert list */}
      <ScrollArea className="max-h-[250px]">
        {filtered.length === 0 ? (
          <div className="text-xs text-white/30 text-center py-4">No alerts</div>
        ) : (
          <div className="space-y-1">
            {filtered.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-2 px-2 py-1.5 rounded text-[11px] ${
                    alert.acknowledged ? "opacity-50" : config.bg
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-white/50">{formatTime(alert.timestamp)}</span>
                      <span className="font-mono text-white/30">{alert.equipmentId}</span>
                    </div>
                    <p className="text-white/80 text-xs mt-0.5">{alert.message}</p>
                  </div>
                  {!alert.acknowledged && onAcknowledge && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-white/40 hover:text-white flex-shrink-0"
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
