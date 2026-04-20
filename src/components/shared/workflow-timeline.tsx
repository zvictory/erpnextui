"use client";

import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATES = [
  "Submitted",
  "Pending Pick",
  "Picking",
  "Stock Check",
  "Packed",
  "To Invoice",
  "Invoiced",
] as const;

// Map workflow_state to translation key
const STATE_KEYS: Record<string, string> = {
  Draft: "draft",
  Submitted: "submitted",
  "Pending Pick": "pendingPick",
  Picking: "picking",
  "Stock Check": "stockCheck",
  Packed: "packed",
  "To Invoice": "toInvoice",
  Invoiced: "invoiced",
};

interface WorkflowTimelineProps {
  currentState: string;
  className?: string;
}

export function WorkflowTimeline({ currentState, className }: WorkflowTimelineProps) {
  const t = useTranslations("workflow");

  // Find the index of current state in the progression
  const currentIdx = STATES.indexOf(currentState as (typeof STATES)[number]);

  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto py-2", className)}>
      {STATES.map((state, idx) => {
        const isPast = currentIdx >= 0 && idx < currentIdx;
        const isCurrent = state === currentState;
        const isFuture = currentIdx >= 0 && idx > currentIdx;

        return (
          <div key={state} className="flex items-center gap-1 flex-shrink-0">
            {idx > 0 && (
              <div
                className={cn(
                  "h-0.5 w-4 sm:w-6",
                  isPast ? "bg-green-500" : isCurrent ? "bg-primary" : "bg-muted",
                )}
              />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full size-6 text-xs",
                  isPast && "bg-green-500 text-white",
                  isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  isFuture && "bg-muted text-muted-foreground",
                )}
              >
                {isPast ? (
                  <Check className="size-3.5" />
                ) : (
                  <Circle className="size-2.5 fill-current" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight text-center max-w-14",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {t(STATE_KEYS[state] ?? state)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
