"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { listAllCapabilities } from "@/lib/permissions/capabilities";
import { SCOPE_WILDCARD } from "@/lib/permissions/constants";
import { NAV_GROUPS, ALL_NAV_CAPABILITY_IDS } from "@/lib/permissions/nav-items";
import { keyOf, navKey, wildcardKey, type GrantKey } from "@/lib/permissions/grant-keys";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VisibilityRow } from "./visibility-row";

type Props = {
  userEmail: string | null;
  onClose: () => void;
};

/**
 * Sheet-wrapped editor — still used by Apply Template flow.
 * The Users tab uses GrantEditorBody inline.
 */
export function GrantEditor({ userEmail, onClose }: Props) {
  const tPerm = useTranslations("permissions");
  const open = !!userEmail;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{tPerm("editTitle")}</SheetTitle>
          <SheetDescription>{userEmail}</SheetDescription>
        </SheetHeader>
        {userEmail && <GrantEditorBody userEmail={userEmail} onSaved={onClose} variant="sheet" />}
      </SheetContent>
    </Sheet>
  );
}

type GrantEditorState = {
  selected: Set<GrantKey>;
  setSelected: React.Dispatch<React.SetStateAction<Set<GrantKey>>>;
  initial: Set<GrantKey>;
};

type BodyProps = {
  userEmail: string;
  onSaved?: () => void;
  variant?: "sheet" | "inline";
  /**
   * Optional controlled state — used when the parent wants to share
   * `selected` with siblings (e.g. SidebarPreview). When omitted,
   * the body manages its own state.
   */
  state?: GrantEditorState;
};

export function GrantEditorBody({ userEmail, onSaved, variant = "inline", state }: BodyProps) {
  const t = useTranslations();
  const tNav = useTranslations("nav");
  const tPerm = useTranslations("permissions");
  const tModule = useTranslations("module");
  const tScope = useTranslations("scopeDim");

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
  });

  const updateGrants = useUpdateUserGrants();

  const internal = useGrantEditorState(state ? null : userEmail);
  const { selected, setSelected, initial } = state ?? internal;

  const [search, setSearch] = useState("");

  const diff = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const k of selected) if (!initial.has(k)) added++;
    for (const k of initial) if (!selected.has(k)) removed++;
    return { added, removed };
  }, [selected, initial]);

  const capabilities = useMemo(
    () => listAllCapabilities(customCaps.map((c) => ({ ...c }))),
    [customCaps],
  );
  const nonNavByModule = useMemo(() => {
    const map = new Map<string, typeof capabilities>();
    for (const c of capabilities) {
      if (ALL_NAV_CAPABILITY_IDS.has(c.id)) continue;
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

  const toggleKey = (k: GrantKey, on?: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const shouldBeOn = typeof on === "boolean" ? on : !next.has(k);
      if (shouldBeOn) next.add(k);
      else next.delete(k);
      return next;
    });
  };

  const handleSave = async () => {
    const grants = [...selected].map((k) => {
      const [capabilityId, scopeDim, scopeValue] = k.split("::");
      return { capabilityId, scopeDim, scopeValue };
    });
    try {
      const result = await updateGrants.mutateAsync({ userEmail, grants });
      toast.success(tPerm("saveToast", { added: result.added, removed: result.removed }));
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tPerm("saveFailed"));
    }
  };

  const handleReset = () => setSelected(new Set(initial));

  const dirty = diff.added > 0 || diff.removed > 0;

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const navSearch = search.trim().toLowerCase();

  return (
    <>
      <div className={variant === "inline" ? "space-y-6 py-4" : "space-y-6 p-4"}>
        {/* Diff banner */}
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs flex items-center justify-between gap-3">
          <span className="text-muted-foreground">
            {dirty
              ? tPerm("pendingDiff", { added: diff.added, removed: diff.removed })
              : tPerm("noChanges")}
          </span>
          {dirty && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 px-2 text-xs">
              {tPerm("revert")}
            </Button>
          )}
        </div>

        {/* Section A: Sidebar visibility */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              {tPerm("sidebarVisibility")}
            </h3>
            <p className="text-xs text-muted-foreground">{tPerm("sidebarVisibilityHint")}</p>
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tPerm("searchNav")}
            className="h-8 text-sm"
          />

          <div className="space-y-2">
            {NAV_GROUPS.map((group) => {
              const itemKeys = group.items.map((item) => navKey(item.navCapability));
              const matched = group.items.filter((item) =>
                !navSearch ? true : tNav(item.tKey).toLowerCase().includes(navSearch),
              );
              if (navSearch && matched.length === 0) return null;

              const checkedCount = itemKeys.filter((k) => selected.has(k)).length;
              const allChecked = checkedCount === group.items.length;
              const someChecked = checkedCount > 0 && !allChecked;

              const setAll = (on: boolean) => {
                setSelected((prev) => {
                  const next = new Set(prev);
                  for (const k of itemKeys) {
                    if (on) next.add(k);
                    else next.delete(k);
                  }
                  return next;
                });
              };

              return (
                <Collapsible key={group.groupKey} defaultOpen>
                  <div className="rounded border border-border/60">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-2 hover:bg-muted/50 rounded px-1 py-1 transition-colors group"
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                          <span className="flex-1 text-left text-sm font-medium">
                            {tNav(`groups.${group.groupKey}`)}
                          </span>
                          <Badge variant="outline" className="text-xs tabular-nums">
                            {tPerm("visibleCount", {
                              count: checkedCount,
                              total: group.items.length,
                            })}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
                      <VisibilityRow
                        checked={allChecked}
                        indeterminate={someChecked}
                        onCheckedChange={(on) => setAll(on)}
                        label=""
                        // master row reuses VisibilityRow only for switch + icon visual
                      />
                    </div>
                    <CollapsibleContent>
                      <div className="border-t border-border/40 px-2 py-1.5 space-y-0.5">
                        {matched.map((item) => {
                          const k = navKey(item.navCapability);
                          return (
                            <VisibilityRow
                              key={item.tKey}
                              checked={selected.has(k)}
                              onCheckedChange={(on) => toggleKey(k, on)}
                              label={tNav(item.tKey)}
                            />
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </section>

        {/* Section B: Data Operations */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2 py-2 group">
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                {tPerm("dataOps")}
              </h3>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-xs text-muted-foreground mb-3">{tPerm("dataOpsHint")}</p>
            <div className="space-y-4">
              {[...nonNavByModule.entries()].map(([module, caps]) => (
                <section key={module} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    {tModule(module)}
                  </h4>
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
                              onCheckedChange={() => toggleKey(k)}
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

                      const wcKey = wildcardKey(cap.id, cap.scopeDim);
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
                                checked={selected.has(wcKey)}
                                onCheckedChange={() => toggleKey(wcKey)}
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
                                <label
                                  key={opt.value}
                                  className="flex items-center gap-1.5 text-xs"
                                >
                                  <Checkbox
                                    checked={selected.has(k)}
                                    onCheckedChange={() => toggleKey(k)}
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
          </CollapsibleContent>
        </Collapsible>
      </div>

      {variant === "sheet" ? (
        <SheetFooter>
          <Button variant="outline" onClick={onSaved}>
            {tPerm("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={updateGrants.isPending || !dirty}>
            {updateGrants.isPending ? tPerm("saving") : tPerm("save")}
          </Button>
        </SheetFooter>
      ) : (
        <div className="sticky bottom-0 -mx-1 mt-2 flex items-center justify-end gap-2 border-t border-border/60 bg-background/95 px-1 py-3 backdrop-blur">
          <Button variant="outline" onClick={handleReset} disabled={!dirty}>
            {tPerm("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={updateGrants.isPending || !dirty}>
            {updateGrants.isPending ? tPerm("saving") : tPerm("save")}
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * Live access to the editor's `selected` set is needed by the sidebar
 * preview. The Users tab calls `useGrantEditorState(userEmail)` to share
 * state with both the editor body and the preview pane.
 */
export function useGrantEditorState(userEmail: string | null) {
  const { data: currentGrants } = useAdminUserGrants(userEmail);
  const initial = useMemo(
    () => new Set<GrantKey>(currentGrants?.map(keyOf) ?? []),
    [currentGrants],
  );
  const [selected, setSelected] = useState<Set<GrantKey>>(initial);

  // Re-seed only when the user switches, or when grants first arrive
  // for the current user. Later refetches (focus / 30s stale /
  // post-save invalidation) yield new array refs with identical
  // content — ignoring them prevents silently wiping in-progress edits.
  const [seedUser, setSeedUser] = useState(userEmail);
  const [hasSeeded, setHasSeeded] = useState(currentGrants !== undefined);
  if (seedUser !== userEmail) {
    setSeedUser(userEmail);
    setHasSeeded(currentGrants !== undefined);
    setSelected(new Set(currentGrants?.map(keyOf) ?? []));
  } else if (!hasSeeded && currentGrants !== undefined) {
    setHasSeeded(true);
    setSelected(new Set(currentGrants.map(keyOf)));
  }

  return { selected, setSelected, initial };
}
