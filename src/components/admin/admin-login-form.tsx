"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminLogin } from "@/hooks/use-admin";

export function AdminLoginForm() {
  const router = useRouter();
  const loginMutation = useAdminLogin();
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;

    loginMutation.mutate({ password }, { onSuccess: () => router.replace("/admin") });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Admin Login</CardTitle>
        <CardDescription>Enter your superuser password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Superuser password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              disabled={loginMutation.isPending}
            />
          </div>
          {loginMutation.error && (
            <p className="text-sm text-destructive">{loginMutation.error.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={loginMutation.isPending || !password}>
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
