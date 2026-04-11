"use client";

import { useState } from "react";
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
  return (
    <PermissionGuard capability="platform.admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Permissions</h1>
          <p className="text-muted-foreground">
            Manage capability grants and review the audit log.
          </p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="templates">Role Templates</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersTab />
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="text-sm text-muted-foreground">
              Role templates — coming soon. For now, grant capabilities per user.
            </div>
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
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Grants</TableHead>
            <TableHead>Last granted</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No user grants yet. Select a user below to grant capabilities.
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
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="mt-4">
        <Button variant="outline" onClick={() => setEditingUser(prompt("User email") ?? null)}>
          Grant new user…
        </Button>
      </div>

      <GrantEditor userEmail={editingUser} onClose={() => setEditingUser(null)} />
    </>
  );
}

function AuditTab() {
  const { data: rows = [], isLoading } = useAdminAuditLog("enforce");

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Capability</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Actor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No audit events recorded.
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
