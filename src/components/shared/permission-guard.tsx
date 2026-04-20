"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import type { PermissionAction } from "@/lib/permissions";
import type { CapabilityId } from "@/lib/permissions/capabilities";

type ScopeDim = "line" | "warehouse" | "company";

interface PermissionGuardProps {
  doctype?: string;
  action?: PermissionAction;
  capability?: CapabilityId;
  scopeDim?: ScopeDim;
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
  capability,
  scopeDim,
  fallback = defaultFallback,
  children,
}: PermissionGuardProps) {
  const router = useRouter();
  const { isLoading: doctypeLoading, permissions } = usePermissions();
  const { data: myPerms, isLoading: grantsLoading } = useMyPermissions();

  const doctypeAllowed = doctype ? permissions(doctype)[action] : true;

  const capabilityAllowed = (() => {
    if (!capability) return true;
    if (myPerms.isSuperuser) return true;
    if (!myPerms.capabilities.has(capability)) return false;
    if (!scopeDim) return true;
    const scope = myPerms.allowedScopes[scopeDim];
    return !!scope && scope.size > 0;
  })();

  const allowed = doctypeAllowed && capabilityAllowed;
  const isLoading = (doctype && doctypeLoading) || (capability && grantsLoading);

  useEffect(() => {
    if (!isLoading && !allowed) {
      const target = capability ?? doctype ?? "this page";
      toast.error(`You don't have access to ${target}`);
      router.replace("/dashboard");
    }
  }, [isLoading, allowed, doctype, capability, router]);

  if (isLoading) return <>{fallback}</>;
  if (!allowed) return null;
  return <>{children}</>;
}
