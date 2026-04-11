"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  useAdminRoleTemplates,
  useApplyRoleTemplate,
  useFrappeUsers,
  type AdminRoleTemplate,
} from "@/hooks/use-admin-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ApplyTemplateDialog({ open, onClose }: Props) {
  const t = useTranslations("permissions");
  const { data: templates = [], isLoading: templatesLoading } = useAdminRoleTemplates();
  const applyMutation = useApplyRoleTemplate();

  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<AdminRoleTemplate | null>(null);

  const { data: users = [], isLoading: usersLoading } = useFrappeUsers(search);

  const filteredUsers = users;

  const handleApply = async () => {
    if (!selectedEmail || !selectedTemplate) return;
    try {
      const result = await applyMutation.mutateAsync({
        userEmail: selectedEmail,
        templateId: selectedTemplate.id,
      });
      toast.success(t("applyToast", { added: result.added, skipped: result.skipped }));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("applyTitle")}</DialogTitle>
          <DialogDescription>{t("applyScopeHint")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("applySelectUser")}</label>
            <Input
              placeholder={t("searchUsers")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {selectedEmail && (
              <p className="text-xs text-muted-foreground">
                Selected: <strong>{selectedEmail}</strong>
              </p>
            )}
            {usersLoading && search.length >= 2 ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded border">
                {filteredUsers.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">
                    {search.length < 2 ? "Type at least 2 characters" : "No users found"}
                  </p>
                ) : (
                  filteredUsers.slice(0, 20).map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${
                        selectedEmail === u.email ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedEmail(u.email)}
                    >
                      <span className="font-medium">{u.fullName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("applySelectTemplate")}</label>
            {templatesLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("applyNoTemplates")}</p>
            ) : (
              <div className="space-y-1">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className={`w-full rounded border px-3 py-2 text-left text-sm hover:bg-accent ${
                      selectedTemplate?.id === tpl.id ? "border-primary bg-accent" : "border-border"
                    }`}
                    onClick={() => setSelectedTemplate(tpl)}
                  >
                    <span className="font-medium">{tpl.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {tpl.items.length} capabilities
                    </span>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedEmail || !selectedTemplate || applyMutation.isPending}
          >
            {applyMutation.isPending ? t("saving") : t("applyBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
