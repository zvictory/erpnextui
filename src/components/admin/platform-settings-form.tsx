"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminSettings, useUpdateSettings, useChangeAdminPassword } from "@/hooks/use-admin";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function PlatformSettingsForm() {
  const { data, isLoading } = useAdminSettings();
  const updateMutation = useUpdateSettings();
  const passwordMutation = useChangeAdminPassword();

  const [appName, setAppName] = useState("");
  const [cacheTtl, setCacheTtl] = useState("");

  // Provisioning settings
  const [provisioningApiUrl, setProvisioningApiUrl] = useState("");
  const [provisioningApiKey, setProvisioningApiKey] = useState("");
  const [provisioningApiSecret, setProvisioningApiSecret] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (data?.settings) {
      setAppName(data.settings.appName);
      setCacheTtl(String(data.settings.tenantCacheTtlMs / 1000));
      setProvisioningApiUrl(data.settings.provisioningApiUrl ?? "");
      setProvisioningApiKey(data.settings.provisioningApiKey ?? "");
      setProvisioningApiSecret(data.settings.provisioningApiSecret ?? "");
    }
  }, [data]);

  function handleSettingsSubmit(e: FormEvent) {
    e.preventDefault();
    const ttlMs = Math.max(0, Number(cacheTtl) * 1000);
    updateMutation.mutate(
      {
        appName,
        tenantCacheTtlMs: ttlMs,
        provisioningApiUrl: provisioningApiUrl || undefined,
        provisioningApiKey: provisioningApiKey || undefined,
        provisioningApiSecret: provisioningApiSecret || undefined,
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    passwordMutation.mutate(
      { currentPassword, newPassword, confirmPassword },
      {
        onSuccess: () => {
          toast.success("Password changed");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>General platform configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSettingsSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cacheTtl">Tenant Cache TTL (seconds)</Label>
              <Input
                id="cacheTtl"
                type="number"
                min="0"
                value={cacheTtl}
                onChange={(e) => setCacheTtl(e.target.value)}
                disabled={updateMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provisioning API</CardTitle>
          <CardDescription>
            Configure the external API that creates ERPNext sites for new registrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSettingsSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="provisioningApiUrl">API URL</Label>
              <Input
                id="provisioningApiUrl"
                placeholder="https://bench.example.com/api/create-site"
                value={provisioningApiUrl}
                onChange={(e) => setProvisioningApiUrl(e.target.value)}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="provisioningApiKey">API Key</Label>
              <Input
                id="provisioningApiKey"
                value={provisioningApiKey}
                onChange={(e) => setProvisioningApiKey(e.target.value)}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="provisioningApiSecret">API Secret</Label>
              <Input
                id="provisioningApiSecret"
                type="password"
                value={provisioningApiSecret}
                onChange={(e) => setProvisioningApiSecret(e.target.value)}
                disabled={updateMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your superuser password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={passwordMutation.isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordMutation.isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              disabled={
                passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword
              }
            >
              {passwordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
