"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FrappeAPIError } from "@/lib/frappe-types";

export function LoginForm() {
  const router = useRouter();
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const loginMutation = useLogin();

  const errorMessage = loginMutation.error
    ? loginMutation.error instanceof FrappeAPIError
      ? loginMutation.error.serverMessages?.[0] ?? loginMutation.error.message
      : "An unexpected error occurred. Please try again."
    : null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!usr.trim() || !pwd) return;
    loginMutation.mutate(
      { usr: usr.trim(), pwd },
      { onSuccess: () => router.replace("/expenses/new") },
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Stable ERP</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-email">Email or Username</Label>
            <Input
              id="login-email"
              type="text"
              placeholder="user@example.com"
              value={usr}
              onChange={(e) => setUsr(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={loginMutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="Password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
              disabled={loginMutation.isPending}
            />
          </div>
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending || !usr.trim() || !pwd}
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
