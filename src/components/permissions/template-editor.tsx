"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { listBuiltinCapabilities } from "@/lib/permissions/capabilities";
import {
  useCreateRoleTemplate,
  useUpdateRoleTemplate,
  type AdminRoleTemplate,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  template: AdminRoleTemplate | null;
  onClose: () => void;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export function TemplateEditor({ mode, template, onClose }: Props) {
  const t = useTranslations();
  const tPerm = useTranslations("permissions");
  const tModule = useTranslations("module");
  const tScope = useTranslations("scopeDim");

  const [id, setId] = useState(() => (mode === "edit" && template ? template.id : ""));
  const [name, setName] = useState(() => (mode === "edit" && template ? template.name : ""));
  const [description, setDescription] = useState(() =>
    mode === "edit" && template ? (template.description ?? "") : "",
  );
  const [selected, setSelected] = useState<Set<string>>(() =>
    mode === "edit" && template
      ? new Set(template.items.map((i) => i.capabilityId))
      : new Set(),
  );

  const createMut = useCreateRoleTemplate();
  const updateMut = useUpdateRoleTemplate();
  const isPending = createMut.isPending || updateMut.isPending;

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

  const toggle = (capId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(capId)) next.delete(capId);
      else next.add(capId);
      return next;
    });
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(tPerm("tpl.nameRequired"));
      return;
    }
    const items = [...selected]
      .map((capId) => {
        const cap = capabilities.find((c) => c.id === capId);
        if (!cap) return null;
        return {
          capabilityId: capId,
          defaultScopeDim: cap.scopeDim ?? "*",
        };
      })
      .filter((x): x is { capabilityId: string; defaultScopeDim: string } => x !== null);

    try {
      if (mode === "create") {
        const finalId = id.trim() || slugify(trimmedName) || `tpl-${Date.now()}`;
        await createMut.mutateAsync({
          id: finalId,
          name: trimmedName,
          description: description.trim() || undefined,
          items,
        });
        toast.success(tPerm("tpl.createdToast"));
      } else if (template) {
        await updateMut.mutateAsync({
          id: template.id,
          name: trimmedName,
          description: description.trim() || null,
          items,
        });
        toast.success(tPerm("tpl.updatedToast"));
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tPerm("saveFailed"));
    }
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? tPerm("tpl.createTitle") : tPerm("tpl.editTitle")}
          </SheetTitle>
          <SheetDescription>{tPerm("tpl.editHint")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">{tPerm("tpl.name")}</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tPerm("tpl.namePlaceholder")}
            />
          </div>

          {mode === "create" && (
            <div className="space-y-1.5">
              <Label htmlFor="tpl-id">{tPerm("tpl.idLabel")}</Label>
              <Input
                id="tpl-id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={slugify(name) || tPerm("tpl.idPlaceholder")}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">{tPerm("tpl.idHint")}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">{tPerm("tpl.description")}</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold">{tPerm("tpl.capabilities")}</h3>
            {[...byModule.entries()].map(([module, caps]) => (
              <section key={module} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                  {tModule(module)}
                </h4>
                <div className="space-y-2">
                  {caps.map((cap) => (
                    <label key={cap.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.has(cap.id)}
                        onCheckedChange={() => toggle(cap.id)}
                      />
                      <span className="flex-1">{t(cap.labelKey)}</span>
                      <Badge variant="outline" className="text-xs">
                        {cap.scopeDim ? tScope(cap.scopeDim) : tPerm("unscoped")}
                      </Badge>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tPerm("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? tPerm("saving") : tPerm("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
