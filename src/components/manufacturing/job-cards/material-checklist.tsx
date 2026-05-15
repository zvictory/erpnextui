"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { JobCardItem } from "@/types/manufacturing";

interface MaterialChecklistProps {
  items: JobCardItem[];
}

export function MaterialChecklist({ items }: MaterialChecklistProps) {
  const t = useTranslations("mfg.jobCards");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(itemCode: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(itemCode)) {
        next.delete(itemCode);
      } else {
        next.add(itemCode);
      }
      return next;
    });
  }

  if (!items || items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("materialChecklist")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-4 pt-0">
        {items.map((item) => (
          <label
            key={item.item_code}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 active:bg-muted cursor-pointer transition-colors min-h-[48px]"
          >
            <Checkbox
              checked={checked.has(item.item_code)}
              onCheckedChange={() => toggle(item.item_code)}
              className="h-5 w-5"
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${checked.has(item.item_code) ? "line-through text-muted-foreground" : ""}`}
              >
                {item.item_name || item.item_code}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.required_qty} {item.uom}
                {item.transferred_qty > 0 && (
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    ({item.transferred_qty} transferred)
                  </span>
                )}
              </p>
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
