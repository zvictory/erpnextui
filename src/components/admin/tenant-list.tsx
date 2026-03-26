"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAdminTenants,
  useDeleteTenant,
  useUpdateTenant,
  useTestTenantConnection,
} from "@/hooks/use-admin";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, PlugZap, Loader2, Power, PowerOff } from "lucide-react";

export function TenantList() {
  const { data, isLoading } = useAdminTenants();
  const deleteMutation = useDeleteTenant();
  const updateMutation = useUpdateTenant();
  const testMutation = useTestTenantConnection();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const tenants = data?.tenants ?? [];

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete tenant "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Tenant "${name}" deleted`),
      onError: (err) => toast.error(err.message),
      onSettled: () => setDeletingId(null),
    });
  }

  function handleToggle(id: string, name: string, currentEnabled: boolean) {
    updateMutation.mutate(
      { id, enabled: !currentEnabled },
      {
        onSuccess: () =>
          toast.success(`Tenant "${name}" ${currentEnabled ? "disabled" : "enabled"}`),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleTest(id: string) {
    setTestingId(id);
    testMutation.mutate(id, {
      onSuccess: (data) => {
        if (data.ok) {
          toast.success(`Connection successful (user: ${data.user})`);
        } else {
          toast.error(`Connection failed: ${data.error}`);
        }
      },
      onError: (err) => toast.error(err.message),
      onSettled: () => setTestingId(null),
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <Link href="/admin/tenants/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No tenants configured yet. Add your first tenant to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">API Key</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-sm text-muted-foreground">{tenant.id}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{tenant.url}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                    {tenant.apiKey}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={tenant.enabled ? "default" : "secondary"}>
                      {tenant.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Test connection"
                        onClick={() => handleTest(tenant.id)}
                        disabled={testingId === tenant.id}
                      >
                        {testingId === tenant.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PlugZap className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={tenant.enabled ? "Disable tenant" : "Enable tenant"}
                        onClick={() => handleToggle(tenant.id, tenant.name, tenant.enabled)}
                      >
                        {tenant.enabled ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Link href={`/admin/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="icon" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => handleDelete(tenant.id, tenant.name)}
                        disabled={deletingId === tenant.id}
                      >
                        {deletingId === tenant.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
