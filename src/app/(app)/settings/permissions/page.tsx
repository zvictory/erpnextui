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
import { Input } from "@/components/ui/input";
import {
  useAdminAuditLog,
  useAdminPermissionUsers,
  useAdminRoleTemplates,
  useDeleteRoleTemplate,
  useFrappeUsers,
  type AdminRoleTemplate,
} from "@/hooks/use-admin-permissions";
import { GrantEditor } from "@/components/permissions/grant-editor";
import { TemplateEditor } from "@/components/permissions/template-editor";
import { ApplyTemplateDialog } from "@/components/permissions/apply-template-dialog";
import { CustomCapabilityManager } from "@/components/permissions/custom-capability-manager";
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
            <TabsTrigger value="customCaps">{t("customCaps")}</TabsTrigger>
            <TabsTrigger value="audit">{t("tabs.audit")}</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersTab />
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <TemplatesTab />
          </TabsContent>

          <TabsContent value="customCaps" className="mt-4">
            <CustomCapabilityManager />
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
  const [applyOpen, setApplyOpen] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const { data: frappeUsers = [], isLoading: frappeLoading } = useFrappeUsers(userSearch);

  const handleSelectFrappeUser = (email: string) => {
    setEditingUser(email);
    setShowUserSearch(false);
    setUserSearch("");
  };

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

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setShowUserSearch(!showUserSearch)}>
          {t("grantNew")}
        </Button>
        <Button variant="outline" onClick={() => setApplyOpen(true)}>
          {t("applyBtn")}
        </Button>
      </div>

      {showUserSearch && (
        <div className="mt-4 rounded border p-3 space-y-2">
          <Input
            placeholder={t("searchUsers")}
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          {frappeLoading && userSearch.length >= 2 ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : frappeUsers.length > 0 ? (
            <div className="max-h-48 overflow-y-auto">
              {frappeUsers.slice(0, 20).map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent rounded"
                  onClick={() => handleSelectFrappeUser(u.email)}
                >
                  <span className="font-medium">{u.fullName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                </button>
              ))}
            </div>
          ) : userSearch.length >= 2 ? (
            <p className="text-xs text-muted-foreground">No users found</p>
          ) : (
            <p className="text-xs text-muted-foreground">Type at least 2 characters to search</p>
          )}
        </div>
      )}

      <GrantEditor userEmail={editingUser} onClose={() => setEditingUser(null)} />
      <ApplyTemplateDialog open={applyOpen} onClose={() => setApplyOpen(false)} />
    </>
  );
}

function TemplatesTab() {
  const t = useTranslations("permissions");
  const { data: templates = [], isLoading } = useAdminRoleTemplates();
  const deleteMut = useDeleteRoleTemplate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingTemplate, setEditingTemplate] = useState<AdminRoleTemplate | null>(null);

  const openCreate = () => {
    setEditorMode("create");
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const openEdit = (tpl: AdminRoleTemplate) => {
    setEditorMode("edit");
    setEditingTemplate(tpl);
    setEditorOpen(true);
  };

  const handleDelete = async (tpl: AdminRoleTemplate) => {
    if (!confirm(t("tpl.deleteConfirm", { name: tpl.name }))) return;
    try {
      await deleteMut.mutateAsync(tpl.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

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
            <TableHead>{t("tpl.name")}</TableHead>
            <TableHead>{t("tpl.description")}</TableHead>
            <TableHead className="text-right">{t("tpl.itemsCount")}</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t("tpl.empty")}
              </TableCell>
            </TableRow>
          ) : (
            templates.map((tpl) => (
              <TableRow key={tpl.id}>
                <TableCell className="font-medium">
                  {tpl.name}
                  <div className="text-xs text-muted-foreground font-mono">{tpl.id}</div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {tpl.description ?? "—"}
                </TableCell>
                <TableCell className="text-right">{tpl.items.length}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(tpl)}>
                    {t("editBtn")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(tpl)}
                    disabled={deleteMut.isPending}
                  >
                    {t("tpl.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="mt-4">
        <Button variant="outline" onClick={openCreate}>
          {t("tpl.new")}
        </Button>
      </div>

      {editorOpen && (
        <TemplateEditor
          mode={editorMode}
          template={editingTemplate}
          onClose={() => setEditorOpen(false)}
        />
      )}
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
                    r.event === "denied"
                      ? "destructive"
                      : r.event === "revoke"
                        ? "secondary"
                        : "outline"
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
