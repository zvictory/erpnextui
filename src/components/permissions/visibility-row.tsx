"use client";

import { Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type VisibilityRowProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  indeterminate?: boolean;
  emphasize?: boolean;
  trailing?: React.ReactNode;
};

export function VisibilityRow({
  checked,
  onCheckedChange,
  label,
  indeterminate,
  emphasize,
  trailing,
}: VisibilityRowProps) {
  const lit = checked || !!indeterminate;
  const Icon = lit ? Eye : EyeOff;

  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/40 cursor-pointer transition-colors",
        emphasize && "font-medium",
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", lit ? "text-foreground" : "text-muted-foreground")}
        aria-hidden
      />
      <span
        className={cn(
          "flex-1 text-sm select-none",
          !lit && "text-muted-foreground line-through decoration-muted-foreground/60",
        )}
      >
        {label}
      </span>
      {trailing}
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  );
}
