"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { listBuiltinCapabilities } from "@/lib/permissions/capabilities";
import { SCOPE_WILDCARD } from "@/lib/permissions/constants";
import { useAdminUserGrants, useUpdateUserGrants } from "@/hooks/use-admin-permissions";
import { getLines } from "@/actions/lines";
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
  const open = !!userEmail;
  const { data: currentGrants, isLoading } = useAdminUserGrants(userEmail);
  const { data: lines = [] } = useQuery({
    queryKey: ["lines", "for-grant-editor"] as const,
    queryFn: async () => {
      const result = await getLines();
      return result.success ? result.data : [];
    },
    staleTime: 60_000,
  });
  const updateGrants = useUpdateUserGrants();

  const [selected, setSelected] = useState<Set<GrantKey>>(new Set());
  const [lastGrantsRef, setLastGrantsRef] = useState(currentGrants);
  if (currentGrants !== lastGrantsRef) {
    setLastGrantsRef(currentGrants);
    setSelected(new Set(currentGrants?.map(keyOf) ?? []));
  }

  const capabilities = useMemo(() => listBuiltinCapabilities(), []);
  const byModule = useMemo(() => {
    const map = new Map<string, typeof capabilities>();
    for (const c of capabilities) {
      const bucket = map.get(c.module) ?? [];
      bucket.push(c);
      map.set(c.module, bucket);
    }
    return map;
  }, [capabilities]);

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
      toast.success(`Saved — ${result.added} added, ${result.removed} removed`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit permissions</SheetTitle>
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
                  {module}
                </h3>
                <div className="space-y-3">
                  {caps.map((cap) => {
                    if (cap.scopeDim === null) {
                      const k = keyOf({ capabilityId: cap.id, scopeDim: "*", scopeValue: "*" });
                      return (
                        <div key={cap.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selected.has(k)}
                            onCheckedChange={() => toggleGrant(k)}
                          />
                          <label className="flex-1 text-sm">{cap.id}</label>
                          <Badge variant="outline" className="text-xs">
                            unscoped
                          </Badge>
                        </div>
                      );
                    }

                    const wildcardKey = keyOf({
                      capabilityId: cap.id,
                      scopeDim: cap.scopeDim,
                      scopeValue: SCOPE_WILDCARD,
                    });

                    return (
                      <div key={cap.id} className="rounded border border-border/60 p-2">
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-sm font-medium">{cap.id}</span>
                          <Badge variant="outline" className="text-xs">
                            {cap.scopeDim}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3">
                          <label className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={selected.has(wildcardKey)}
                              onCheckedChange={() => toggleGrant(wildcardKey)}
                            />
                            All ({cap.scopeDim}s)
                          </label>
                          {cap.scopeDim === "line" &&
                            lines.map((line) => {
                              const k = keyOf({
                                capabilityId: cap.id,
                                scopeDim: "line",
                                scopeValue: String(line.id),
                              });
                              return (
                                <label key={line.id} className="flex items-center gap-1.5 text-xs">
                                  <Checkbox
                                    checked={selected.has(k)}
                                    onCheckedChange={() => toggleGrant(k)}
                                  />
                                  {line.name}
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
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateGrants.isPending}>
            {updateGrants.isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
