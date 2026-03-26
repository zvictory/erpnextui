"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAdminRegistrations,
  useRegistrationAction,
  useDeleteRegistration,
} from "@/hooks/use-admin";
import { toast } from "sonner";
import { CheckCircle, XCircle, Trash2, Loader2, RefreshCw, AlertCircle } from "lucide-react";

type RegistrationStatus =
  | "pending"
  | "approved"
  | "provisioning"
  | "active"
  | "rejected"
  | "failed";

const STATUS_BADGE: Record<
  RegistrationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  provisioning: { label: "Provisioning", variant: "default" },
  active: { label: "Active", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  failed: { label: "Failed", variant: "destructive" },
};

export function RegistrationList() {
  const { data, isLoading } = useAdminRegistrations();
  const actionMutation = useRegistrationAction();
  const deleteMutation = useDeleteRegistration();
  const [actionId, setActionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const registrations = data?.registrations ?? [];

  // Track previous statuses to detect transitions from "provisioning" → "active"/"failed"
  const prevStatuses = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    for (const reg of registrations) {
      const prev = prevStatuses.current.get(reg.id);
      if (prev === "provisioning" && reg.status === "active") {
        toast.success(`"${reg.companyName}" provisioned successfully`);
      } else if (prev === "provisioning" && reg.status === "failed") {
        toast.error(
          `Provisioning failed for "${reg.companyName}": ${reg.provisioningError ?? "Unknown error"}`,
        );
      }
      prevStatuses.current.set(reg.id, reg.status);
    }
  }, [registrations]);

  function handleApprove(id: string, companyName: string) {
    if (!confirm(`Approve registration for "${companyName}"? This will start site provisioning.`))
      return;
    setActionId(id);
    actionMutation.mutate(
      { id, action: "approve" },
      {
        onSuccess: () => {
          toast.info(`Provisioning started for "${companyName}"...`);
        },
        onError: (err) => toast.error(err.message),
        onSettled: () => setActionId(null),
      },
    );
  }

  function handleReject(id: string, companyName: string) {
    const reason = prompt(`Reject "${companyName}"? Enter reason (optional):`);
    if (reason === null) return; // cancelled
    setActionId(id);
    actionMutation.mutate(
      { id, action: "reject", rejectReason: reason || undefined },
      {
        onSuccess: () => toast.success(`"${companyName}" rejected`),
        onError: (err) => toast.error(err.message),
        onSettled: () => setActionId(null),
      },
    );
  }

  function handleDelete(id: string, companyName: string) {
    if (!confirm(`Delete registration for "${companyName}"? This cannot be undone.`)) return;
    setDeletingId(id);
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Registration deleted`),
      onError: (err) => toast.error(err.message),
      onSettled: () => setDeletingId(null),
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
      <h1 className="text-2xl font-semibold">Registrations</h1>

      {registrations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No registration requests yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Country / Currency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => {
                const badge = STATUS_BADGE[reg.status];
                const isActioning = actionId === reg.id;
                const isDeleting = deletingId === reg.id;

                return (
                  <tr key={reg.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{reg.companyName}</td>
                    <td className="px-4 py-3 text-sm">{reg.email}</td>
                    <td className="px-4 py-3 text-sm">{reg.phone}</td>
                    <td className="px-4 py-3 text-sm">
                      {reg.country} / {reg.currency}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={badge.variant}
                          className={
                            reg.status === "provisioning"
                              ? "animate-pulse"
                              : reg.status === "pending"
                                ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                                : reg.status === "active"
                                  ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                                  : ""
                          }
                        >
                          {badge.label}
                        </Badge>
                        {reg.status === "failed" && reg.provisioningError && (
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {reg.provisioningError}
                          </span>
                        )}
                        {reg.status === "rejected" && reg.rejectReason && (
                          <span className="text-xs text-muted-foreground">{reg.rejectReason}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {(reg.status === "pending" || reg.status === "failed") && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={reg.status === "failed" ? "Retry provisioning" : "Approve"}
                              onClick={() => handleApprove(reg.id, reg.companyName)}
                              disabled={isActioning}
                            >
                              {isActioning ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : reg.status === "failed" ? (
                                <RefreshCw className="h-4 w-4 text-orange-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            {reg.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Reject"
                                onClick={() => handleReject(reg.id, reg.companyName)}
                                disabled={isActioning}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => handleDelete(reg.id, reg.companyName)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
