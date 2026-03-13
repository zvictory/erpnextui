"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODULE_GROUPS, ALL_MODULE_GROUP_KEYS } from "@/lib/module-groups";
import { useAdminTenant, useCreateTenant, useUpdateTenant } from "@/hooks/use-admin";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface TenantFormProps {
  tenantId?: string; // undefined = create mode
}

export function TenantForm({ tenantId }: TenantFormProps) {
  const router = useRouter();
  const isEdit = !!tenantId;
  const { data: tenantData, isLoading: loadingTenant } = useAdminTenant(tenantId ?? "");
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [enabledModuleGroups, setEnabledModuleGroups] = useState<string[]>([
    ...ALL_MODULE_GROUP_KEYS,
  ]);

  useEffect(() => {
    if (tenantData?.tenant) {
      const t = tenantData.tenant;
      setSlug(t.id);
      setName(t.name);
      setUrl(t.url);
      // apiKey is masked — leave field empty unless user types new one
      setEnabled(t.enabled);
      setEnabledModuleGroups(t.enabledModuleGroups ?? [...ALL_MODULE_GROUP_KEYS]);
    }
  }, [tenantData]);

  const isBusy = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug || !name || !url || (!isEdit && !apiKey)) return;

    if (isEdit) {
      const updates: Record<string, unknown> = {
        id: tenantId!,
        name,
        url,
        enabled,
        enabledModuleGroups,
      };
      if (apiKey) updates.apiKey = apiKey; // only update if user entered new key
      updateMutation.mutate(updates as { id: string; [key: string]: unknown }, {
        onSuccess: () => {
          toast.success("Tenant updated");
          router.push("/admin");
        },
        onError: (err) => toast.error(err.message),
      });
    } else {
      createMutation.mutate(
        { id: slug, name, url, apiKey, enabled, enabledModuleGroups },
        {
          onSuccess: () => {
            toast.success("Tenant created");
            router.push("/admin");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  }

  if (isEdit && loadingTenant) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/admin">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Button>
      </Link>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Tenant" : "Add Tenant"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="e.g. anjan"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                disabled={isEdit || isBusy}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="e.g. Anjan Group"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="url">Site URL</Label>
              <Input
                id="url"
                placeholder="https://anjan.erpstable.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey">API Key{isEdit && " (leave blank to keep current)"}</Label>
              <Input
                id="apiKey"
                placeholder="api_key:api_secret"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={isBusy}
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Enabled Modules</Label>
              <div className="space-y-2">
                {ALL_MODULE_GROUP_KEYS.map((key) => {
                  const group = MODULE_GROUPS[key];
                  const isAlwaysOn = !!group.alwaysEnabled;
                  const checked = isAlwaysOn || enabledModuleGroups.includes(key);
                  return (
                    <label key={key} className="flex items-start gap-3">
                      <Checkbox
                        checked={checked}
                        disabled={isBusy || isAlwaysOn}
                        onCheckedChange={(v) => {
                          if (isAlwaysOn) return;
                          setEnabledModuleGroups((prev) =>
                            v ? [...prev, key] : prev.filter((k) => k !== key),
                          );
                        }}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium leading-none">
                          {group.label}
                          {isAlwaysOn && (
                            <span className="ml-1 text-xs text-muted-foreground">(always on)</span>
                          )}
                        </span>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {(createMutation.error || updateMutation.error) && (
              <p className="text-sm text-destructive">
                {(createMutation.error || updateMutation.error)?.message}
              </p>
            )}

            <Button
              type="submit"
              disabled={isBusy || !slug || !name || !url || (!isEdit && !apiKey)}
            >
              {isBusy
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Tenant"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
