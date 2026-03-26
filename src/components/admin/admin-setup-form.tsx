"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminSetup } from "@/hooks/use-admin";

export function AdminSetupForm() {
  const router = useRouter();
  const setupMutation = useAdminSetup();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validationError =
    confirmPassword && password !== confirmPassword
      ? "Passwords do not match"
      : password && password.length < 8
        ? "Password must be at least 8 characters"
        : null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (validationError || !password || !confirmPassword) return;

    setupMutation.mutate(
      { password, confirmPassword },
      { onSuccess: () => router.replace("/admin") },
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Welcome to Stable ERP</CardTitle>
        <CardDescription>Set up your superuser password to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              disabled={setupMutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={setupMutation.isPending}
            />
          </div>
          {(validationError || setupMutation.error) && (
            <p className="text-sm text-destructive">
              {validationError || setupMutation.error?.message}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={setupMutation.isPending || !password || !confirmPassword || !!validationError}
          >
            {setupMutation.isPending ? "Setting up..." : "Create Admin Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
