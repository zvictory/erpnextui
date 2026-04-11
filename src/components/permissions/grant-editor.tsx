"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { listAllCapabilities } from "@/lib/permissions/capabilities";
import { SCOPE_WILDCARD } from "@/lib/permissions/constants";
import {
  useAdminUserGrants,
  useUpdateUserGrants,
  useCustomCapabilities,
} from "@/hooks/use-admin-permissions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type GrantKey = string;

const keyOf = (g: { capabilityId: string; scopeDim: string; scopeValue: string }) =>
  `${g.capabilityId}::${g.scopeDim}::${g.scopeValue}`;

type Props = {
  userEmail: string | null;
  onClose: () => void;
};

export function GrantEditor({ userEmail, onClose }: Props) {
  const t = useTranslations();
  const tPerm = useTranslations("permissions");
  const tModule = useTranslations("module");
  const tScope = useTranslations("scopeDim");
  const open = !!userEmail;
  const { data: currentGrants, isLoading } = useAdminUserGrants(userEmail);
  const { data: customCaps = [] } = useCustomCapabilities();

  const { data: lines = [] } = useQuery({
    queryKey: ["lines", "for-grant-editor"] as const,
    queryFn: async () => {
      const result = await fetch("/api/admin/permissions/scope-values?dim=line", {
        credentials: "include",
      });
      if (!result.ok) return [];
      const json = await result.json();
      return (json.values ?? []) as Array<{ value: string; label: string }>;
    },
    staleTime: 60_000,
    enabled: open,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["scope-values", "warehouse", "for-grant-editor"] as const,
    queryFn: async () => {
      const result = await fetch("/api/admin/permissions/scope-values?dim=warehouse", {
        credentials: "include",
      });
      if (!result.ok) return [];
      const json = await result.json();
      return (json.values ?? []) as Array<{ value: string; label: string }>;
    },
    staleTime: 60_000,
    enabled: open,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["scope-values", "company", "for-grant-editor"] as const,
    queryFn: async () => {
      const result = await fetch("/api/admin/permissions/scope-values?dim=company", {
        credentials: "include",
      });
      if (!result.ok) return [];
      const json = await result.json();
      return (json.values ?? []) as Array<{ value: string; label: string }>;
    },
    staleTime: 60_000,
    enabled: open,
  });

  const updateGrants = useUpdateUserGrants();

  const [selected, setSelected] = useState<Set<GrantKey>>(new Set());
  const [lastGrantsRef, setLastGrantsRef] = useState(currentGrants);
  if (currentGrants !== lastGrantsRef) {
    setLastGrantsRef(currentGrants);
    setSelected(new Set(currentGrants?.map(keyOf) ?? []));
  }

  const capabilities = useMemo(
    () => listAllCapabilities(customCaps.map((c) => ({ ...c }))),
    [customCaps],
  );
  const byModule = useMemo(() => {
    const map = new Map<string, typeof capabilities>();
    for (const c of capabilities) {
      const bucket = map.get(c.module) ?? [];
      bucket.push(c);
      map.set(c.module, bucket);
    }
    return map;
  }, [capabilities]);

  const scopeValuesForDim = (dim: string) => {
    if (dim === "line") return lines;
    if (dim === "warehouse") return warehouses;
    if (dim === "company") return companies;
    return [];
  };

  const toggleGrant = (grantKey: GrantKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(grantKey)) next.delete(grantKey);
      else next.add(grantKey);
      return next;
    });
  };

  const handleSave = async () => {
    if (!userEmail) return;
    const grants = [...selected].map((k) => {
      const [capabilityId, scopeDim, scopeValue] = k.split("::");
      return { capabilityId, scopeDim, scopeValue };
    });
    try {
      const result = await updateGrants.mutateAsync({ userEmail, grants });
      toast.success(tPerm("saveToast", { added: result.added, removed: result.removed }));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tPerm("saveFailed"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{tPerm("editTitle")}</SheetTitle>
          <SheetDescription>{userEmail}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-6 p-4">
            {[...byModule.entries()].map(([module, caps]) => (
              <section key={module} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                  {tModule(module)}
                </h3>
                <div className="space-y-3">
                  {caps.map((cap) => {
                    if (cap.scopeDim === null) {
                      const k = keyOf({
                        capabilityId: cap.id,
                        scopeDim: "*",
                        scopeValue: "*",
                      });
                      return (
                        <div key={cap.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selected.has(k)}
                            onCheckedChange={() => toggleGrant(k)}
                          />
                          <label className="flex-1 text-sm">{t(cap.labelKey)}</label>
                          <Badge variant="outline" className="text-xs">
                            {tPerm("unscoped")}
                          </Badge>
                          {cap.isCustom && (
                            <Badge variant="secondary" className="text-xs">
                              custom
                            </Badge>
                          )}
                        </div>
                      );
                    }

                    const wildcardKey = keyOf({
                      capabilityId: cap.id,
                      scopeDim: cap.scopeDim,
                      scopeValue: SCOPE_WILDCARD,
                    });

                    const dimOptions = scopeValuesForDim(cap.scopeDim);

                    return (
                      <div key={cap.id} className="rounded border border-border/60 p-2">
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-sm font-medium">{t(cap.labelKey)}</span>
                          <Badge variant="outline" className="text-xs">
                            {tScope(cap.scopeDim)}
                          </Badge>
                          {cap.isCustom && (
                            <Badge variant="secondary" className="text-xs">
                              custom
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3">
                          <label className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={selected.has(wildcardKey)}
                              onCheckedChange={() => toggleGrant(wildcardKey)}
                            />
                            {tPerm("allOf", { dim: tScope(cap.scopeDim) })}
                          </label>
                          {dimOptions.map((opt) => {
                            const k = keyOf({
                              capabilityId: cap.id,
                              scopeDim: cap.scopeDim!,
                              scopeValue: opt.value,
                            });
                            return (
                              <label key={opt.value} className="flex items-center gap-1.5 text-xs">
                                <Checkbox
                                  checked={selected.has(k)}
                                  onCheckedChange={() => toggleGrant(k)}
                                />
                                {opt.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            {tPerm("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={updateGrants.isPending}>
            {updateGrants.isPending ? tPerm("saving") : tPerm("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
