"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuditLog, useAdminPermissionUsers } from "@/hooks/use-admin-permissions";
import { GrantEditor } from "@/components/permissions/grant-editor";
import { formatDate } from "@/lib/formatters";

export default function PermissionsAdminPage() {
  const t = useTranslations("permissions");
  return (
    <PermissionGuard capability="platform.admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">{t("tabs.users")}</TabsTrigger>
            <TabsTrigger value="templates">{t("tabs.templates")}</TabsTrigger>
            <TabsTrigger value="audit">{t("tabs.audit")}</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersTab />
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="text-sm text-muted-foreground">{t("templatesComingSoon")}</div>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

function UsersTab() {
  const t = useTranslations("permissions");
  const { data: users = [], isLoading } = useAdminPermissionUsers();
  const [editingUser, setEditingUser] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.email")}</TableHead>
            <TableHead className="text-right">{t("columns.grants")}</TableHead>
            <TableHead>{t("columns.lastGranted")}</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t("noUsers")}
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.userEmail}>
                <TableCell className="font-mono text-xs">{u.userEmail}</TableCell>
                <TableCell className="text-right">{u.grantCount}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.lastGrantedAt ? formatDate(u.lastGrantedAt) : "—"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setEditingUser(u.userEmail)}>
                    {t("editBtn")}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => setEditingUser(prompt(t("columns.email")) ?? null)}
        >
          {t("grantNew")}
        </Button>
      </div>

      <GrantEditor userEmail={editingUser} onClose={() => setEditingUser(null)} />
    </>
  );
}

function AuditTab() {
  const t = useTranslations("permissions");
  const { data: rows = [], isLoading } = useAdminAuditLog("enforce");

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.when")}</TableHead>
          <TableHead>{t("columns.event")}</TableHead>
          <TableHead>{t("columns.user")}</TableHead>
          <TableHead>{t("columns.capability")}</TableHead>
          <TableHead>{t("columns.scope")}</TableHead>
          <TableHead>{t("columns.actor")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              {t("noAudit")}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs">
                {r.occurredAt ? formatDate(r.occurredAt) : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    r.event === "denied" ? "destructive" : r.event === "revoke" ? "secondary" : "outline"
                  }
                >
                  {r.event ?? "dryrun"}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{r.userEmail}</TableCell>
              <TableCell className="font-mono text-xs">{r.capabilityId}</TableCell>
              <TableCell className="text-xs">
                {r.scopeDim ? `${r.scopeDim}=${r.scopeValue}` : "—"}
              </TableCell>
              <TableCell className="font-mono text-xs">{r.actorEmail ?? "—"}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
