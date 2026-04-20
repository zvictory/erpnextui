"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  useAdminRoleTemplates,
  useApplyRoleTemplate,
  useFrappeUsers,
  useScopeValues,
  type AdminRoleTemplate,
} from "@/hooks/use-admin-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SCOPE_WILDCARD } from "@/lib/permissions/constants";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ScopeDim = "line" | "warehouse" | "company";
const SCOPED_DIMS: ScopeDim[] = ["line", "warehouse", "company"];

export function ApplyTemplateDialog({ open, onClose }: Props) {
  const t = useTranslations("permissions");
  const { data: templates = [], isLoading: templatesLoading } = useAdminRoleTemplates();
  const applyMutation = useApplyRoleTemplate();

  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<AdminRoleTemplate | null>(null);
  // selectedScopes: dim -> Set of selected values (SCOPE_WILDCARD means "all")
  const [selectedScopes, setSelectedScopes] = useState<Record<string, Set<string>>>({});

  const { data: users = [], isLoading: usersLoading } = useFrappeUsers(search);

  // Determine which dims the selected template actually needs
  const requiredDims = useMemo((): ScopeDim[] => {
    if (!selectedTemplate) return [];
    const dims = new Set<ScopeDim>();
    for (const item of selectedTemplate.items) {
      if (SCOPED_DIMS.includes(item.defaultScopeDim as ScopeDim)) {
        dims.add(item.defaultScopeDim as ScopeDim);
      }
    }
    return Array.from(dims);
  }, [selectedTemplate]);

  const lines = useScopeValues(requiredDims.includes("line") ? "line" : null);
  const warehouses = useScopeValues(requiredDims.includes("warehouse") ? "warehouse" : null);
  const companies = useScopeValues(requiredDims.includes("company") ? "company" : null);

  const scopeOptionsForDim = (dim: ScopeDim) => {
    if (dim === "line") return lines.data ?? [];
    if (dim === "warehouse") return warehouses.data ?? [];
    return companies.data ?? [];
  };

  const toggleScopeValue = (dim: string, value: string) => {
    setSelectedScopes((prev) => {
      const current = new Set(prev[dim] ?? []);
      if (value === SCOPE_WILDCARD) {
        // wildcard toggle: if already selected, clear all; otherwise select only wildcard
        if (current.has(SCOPE_WILDCARD)) {
          current.delete(SCOPE_WILDCARD);
        } else {
          current.clear();
          current.add(SCOPE_WILDCARD);
        }
      } else {
        current.delete(SCOPE_WILDCARD); // deselect wildcard when picking specific
        if (current.has(value)) {
          current.delete(value);
        } else {
          current.add(value);
        }
      }
      return { ...prev, [dim]: current };
    });
  };

  const handleSelectTemplate = (tpl: AdminRoleTemplate) => {
    setSelectedTemplate(tpl);
    setSelectedScopes({});
  };

  const buildScopeValues = (): Record<string, string[]> => {
    if (!selectedTemplate) return {};
    const result: Record<string, string[]> = {};
    for (const item of selectedTemplate.items) {
      const dim = item.defaultScopeDim;
      if (!SCOPED_DIMS.includes(dim as ScopeDim)) continue;
      const selected = selectedScopes[dim];
      if (selected && selected.size > 0) {
        result[item.capabilityId] = Array.from(selected);
      }
    }
    return result;
  };

  const canApply =
    !!selectedEmail &&
    !!selectedTemplate &&
    // every required scoped dim must have at least one value selected
    requiredDims.every((dim) => {
      const s = selectedScopes[dim];
      return s && s.size > 0;
    });

  const handleApply = async () => {
    if (!selectedEmail || !selectedTemplate) return;
    try {
      const result = await applyMutation.mutateAsync({
        userEmail: selectedEmail,
        templateId: selectedTemplate.id,
        scopeValues: buildScopeValues(),
      });
      toast.success(t("applyToast", { added: result.added, skipped: result.skipped }));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("applyTitle")}</DialogTitle>
          <DialogDescription>{t("applyScopeHint")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("applySelectUser")}</label>
            <Input
              placeholder={t("searchUsers")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {selectedEmail && (
              <p className="text-xs text-muted-foreground">
                Selected: <strong>{selectedEmail}</strong>
              </p>
            )}
            {usersLoading && search.length >= 2 ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded border">
                {users.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">
                    {search.length < 2 ? "Type at least 2 characters" : "No users found"}
                  </p>
                ) : (
                  users.slice(0, 20).map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${
                        selectedEmail === u.email ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedEmail(u.email)}
                    >
                      <span className="font-medium">{u.fullName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Template selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("applySelectTemplate")}</label>
            {templatesLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("applyNoTemplates")}</p>
            ) : (
              <div className="space-y-1">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className={`w-full rounded border px-3 py-2 text-left text-sm hover:bg-accent ${
                      selectedTemplate?.id === tpl.id ? "border-primary bg-accent" : "border-border"
                    }`}
                    onClick={() => handleSelectTemplate(tpl)}
                  >
                    <span className="font-medium">{tpl.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {tpl.items.length} capabilities
                    </span>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scope pickers — shown only when template requires them */}
          {requiredDims.length > 0 && (
            <div className="space-y-3 rounded border p-3">
              <p className="text-xs font-medium text-muted-foreground">{t("applyScopeSection")}</p>
              {requiredDims.map((dim) => {
                const options = scopeOptionsForDim(dim);
                const selected = selectedScopes[dim] ?? new Set<string>();
                return (
                  <div key={dim} className="space-y-1.5">
                    <Label className="text-xs capitalize">{dim}</Label>
                    <div className="space-y-1 pl-1">
                      {/* All (wildcard) */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`scope-${dim}-all`}
                          checked={selected.has(SCOPE_WILDCARD)}
                          onCheckedChange={() => toggleScopeValue(dim, SCOPE_WILDCARD)}
                        />
                        <label htmlFor={`scope-${dim}-all`} className="text-xs cursor-pointer">
                          {t("applyScopeAll")}
                        </label>
                      </div>
                      {/* Specific values */}
                      {options.map((opt) => (
                        <div key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`scope-${dim}-${opt.value}`}
                            checked={selected.has(opt.value)}
                            onCheckedChange={() => toggleScopeValue(dim, opt.value)}
                          />
                          <label
                            htmlFor={`scope-${dim}-${opt.value}`}
                            className="text-xs cursor-pointer"
                          >
                            {opt.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={handleApply} disabled={!canApply || applyMutation.isPending}>
            {applyMutation.isPending ? t("saving") : t("applyBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
