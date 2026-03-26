"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import type { PermissionAction } from "@/lib/permissions";

interface PermissionGuardProps {
  doctype: string;
  action?: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

const defaultFallback = (
  <div className="space-y-4 p-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
  </div>
);

export function PermissionGuard({
  doctype,
  action = "read",
  fallback = defaultFallback,
  children,
}: PermissionGuardProps) {
  const router = useRouter();
  const { isLoading, permissions } = usePermissions();
  const perms = permissions(doctype);
  const allowed = perms[action];

  useEffect(() => {
    if (!isLoading && !allowed) {
      toast.error(`You don't have access to ${doctype}`);
      router.replace("/dashboard");
    }
  }, [isLoading, allowed, doctype, router]);

  if (isLoading) return <>{fallback}</>;
  if (!allowed) return null;
  return <>{children}</>;
}
