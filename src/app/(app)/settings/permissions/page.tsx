"use client";

import { useMemo, useState } from "react";
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
import { GrantEditorBody, useGrantEditorState } from "@/components/permissions/grant-editor";
import { SidebarPreview } from "@/components/permissions/sidebar-preview";
import { TemplateEditor } from "@/components/permissions/template-editor";
import { ApplyTemplateDialog } from "@/components/permissions/apply-template-dialog";
import { CustomCapabilityManager } from "@/components/permissions/custom-capability-manager";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  const { data: grantedUsers = [], isLoading: grantsLoading } = useAdminPermissionUsers();
  const { data: allFrappeUsers = [], isLoading: frappeLoading } = useFrappeUsers("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Build email → grant info map from local DB
  const grantMap = useMemo(() => {
    const map = new Map<string, { grantCount: number; lastGrantedAt: string | null }>();
    for (const u of grantedUsers) {
      map.set(u.userEmail, { grantCount: u.grantCount, lastGrantedAt: u.lastGrantedAt });
    }
    return map;
  }, [grantedUsers]);

  // Merge all Frappe users with their grant counts
  const mergedUsers = useMemo(() => {
    const seen = new Set(allFrappeUsers.map((u) => u.email));
    const result = allFrappeUsers.map((u) => ({
      email: u.email,
      fullName: u.fullName,
      ...(grantMap.get(u.email) ?? { grantCount: 0, lastGrantedAt: null }),
    }));
    // Append granted users not in Frappe list (e.g. disabled accounts)
    for (const u of grantedUsers) {
      if (!seen.has(u.userEmail)) {
        result.push({
          email: u.userEmail,
          fullName: u.userEmail,
          grantCount: u.grantCount,
          lastGrantedAt: u.lastGrantedAt,
        });
      }
    }
    return result;
  }, [allFrappeUsers, grantedUsers, grantMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mergedUsers;
    return mergedUsers.filter((u) => u.email.includes(q) || u.fullName.toLowerCase().includes(q));
  }, [mergedUsers, search]);

  const editorState = useGrantEditorState(editingUser);

  if (grantsLoading || frappeLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button variant="outline" onClick={() => setApplyOpen(true)}>
          {t("applyBtn")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr_320px]">
        {/* Left pane: user list */}
        <Card className="p-3 space-y-2 md:max-h-[80vh] md:overflow-y-auto">
          <Input
            placeholder={t("searchUsers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="space-y-1">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">{t("noUsers")}</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => setEditingUser(u.email)}
                  className={cn(
                    "w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors",
                    editingUser === u.email && "bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{u.fullName}</div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">
                        {u.email}
                      </div>
                    </div>
                    <Badge
                      variant={u.grantCount > 0 ? "default" : "outline"}
                      className="shrink-0 text-[10px] tabular-nums"
                    >
                      {u.grantCount}
                    </Badge>
                  </div>
                  {u.lastGrantedAt && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDate(u.lastGrantedAt)}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Center pane: editor */}
        <Card className="p-4">
          {editingUser ? (
            <>
              <div className="mb-3">
                <h2 className="text-sm font-semibold">{t("editTitle")}</h2>
                <p className="font-mono text-xs text-muted-foreground">{editingUser}</p>
              </div>
              <GrantEditorBody
                userEmail={editingUser}
                state={editorState}
                onSaved={() => {
                  /* keep user selected after save */
                }}
                variant="inline"
              />
            </>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border/60">
              <p className="text-sm text-muted-foreground">{t("clickUserToEdit")}</p>
            </div>
          )}
        </Card>

        {/* Right pane: sidebar preview */}
        <div className="md:sticky md:top-4 md:self-start">
          <Card className="p-4">
            <SidebarPreview selected={editorState.selected} userEmail={editingUser} />
          </Card>
        </div>
      </div>

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
