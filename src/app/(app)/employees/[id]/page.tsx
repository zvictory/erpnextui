"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { useEmployee } from "@/hooks/use-employees";
import { formatDate } from "@/lib/formatters";

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("employees");
  const { data: employee, isLoading } = useEmployee(decodeURIComponent(id));

  return (
    <PermissionGuard doctype="Employee" action="read">
      <FormPageLayout title={employee?.employee_name ?? t("employee")} backHref="/employees">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : employee ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("employeeName")} value={employee.employee_name} />
              <Field label="ID" value={employee.name} />
              <Field label={t("designation")} value={employee.designation} />
              <Field label={t("department")} value={employee.department} />
              <Field label={t("phone")} value={employee.cell_phone} />
              <Field label={t("email")} value={employee.personal_email} />
              <Field
                label={t("dateOfJoining")}
                value={employee.date_of_joining ? formatDate(employee.date_of_joining) : "—"}
              />
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("status")}</p>
                <Badge variant={employee.status === "Active" ? "default" : "secondary"}>
                  {employee.status}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("noEmployees")}</p>
        )}
      </FormPageLayout>
    </PermissionGuard>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
