"use client";

import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { NAV_GROUPS } from "@/lib/permissions/nav-items";
import { navKey, type GrantKey } from "@/lib/permissions/grant-keys";
import { cn } from "@/lib/utils";

type SidebarPreviewProps = {
  selected: Set<GrantKey>;
  userEmail: string | null;
};

export function SidebarPreview({ selected, userEmail }: SidebarPreviewProps) {
  const tNav = useTranslations("nav");
  const tPerm = useTranslations("permissions");

  if (!userEmail) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        {tPerm("previewEmpty")}
      </div>
    );
  }

  const totalVisible = NAV_GROUPS.reduce(
    (sum, group) =>
      sum + group.items.filter((item) => selected.has(navKey(item.navCapability))).length,
    0,
  );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{tPerm("previewTitle")}</h3>
        <p className="text-xs text-muted-foreground">{tPerm("previewHelp")}</p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {tPerm("previewVisibleSummary", { count: totalVisible })}
        </p>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-3 max-h-[70vh] overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const visibleCount = group.items.filter((item) =>
            selected.has(navKey(item.navCapability)),
          ).length;

          return (
            <section key={group.groupKey} className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {tNav(`groups.${group.groupKey}`)}
                </h4>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {visibleCount}/{group.items.length}
                </span>
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const lit = selected.has(navKey(item.navCapability));
                  const Icon = lit ? Eye : EyeOff;
                  return (
                    <li
                      key={item.tKey}
                      className={cn(
                        "flex items-center gap-2 rounded px-2 py-1 text-sm",
                        lit
                          ? "text-foreground"
                          : "text-muted-foreground line-through decoration-muted-foreground/60",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{tNav(item.tKey)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
