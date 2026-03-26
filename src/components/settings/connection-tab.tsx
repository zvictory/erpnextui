"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wifi, WifiOff } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

/** Extract display name from site URL: "https://anjan.erpstable.com" → "Anjan" */
function getTenantDisplayName(siteUrl: string): string {
  try {
    const hostname = new URL(siteUrl).hostname;
    const name = hostname.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return siteUrl || "Unknown";
  }
}

export function ConnectionTab() {
  const siteUrl = useAuthStore((s) => s.siteUrl);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!siteUrl) {
      setConnected(false);
      return;
    }
    let cancelled = false;
    fetch("/api/proxy/api/method/frappe.auth.get_logged_user", {
      headers: { "X-Frappe-Site": siteUrl },
      credentials: "include",
    })
      .then((res) => {
        if (!cancelled) setConnected(res.ok);
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteUrl]);

  function handleClearCache() {
    queryClient.clear();
    toast.success("Query cache cleared");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ERPNext Connection</CardTitle>
          <CardDescription>Current site connection details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="shrink-0 w-24 text-muted-foreground">Site</Label>
            <span className="text-sm font-medium">
              {siteUrl ? getTenantDisplayName(siteUrl) : "Not connected"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Label className="shrink-0 w-24 text-muted-foreground">Status</Label>
            {connected === null ? (
              <Badge variant="secondary">Checking...</Badge>
            ) : connected ? (
              <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
                <Wifi className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Label className="shrink-0 w-24 text-muted-foreground">User</Label>
            <span className="text-sm">{user || "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache</CardTitle>
          <CardDescription>Manage cached data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleClearCache}>
            Clear Cache
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
