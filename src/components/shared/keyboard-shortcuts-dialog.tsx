"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const t = useTranslations("common");

  const shortcuts = [
    { keys: "\u2318K / Ctrl+K", description: t("shortcutSearch") },
    { keys: "\u2318N / Ctrl+N", description: t("shortcutNew") },
    { keys: "Escape", description: t("shortcutClose") },
    { keys: "?", description: t("keyboardShortcuts") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("keyboardShortcuts")}</DialogTitle>
          <DialogDescription>{t("shortcutClose")}</DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Shortcut</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shortcuts.map((s) => (
              <TableRow key={s.keys}>
                <TableCell>
                  <kbd className="inline-flex items-center rounded border bg-muted px-2 py-0.5 font-mono text-xs">
                    {s.keys}
                  </kbd>
                </TableCell>
                <TableCell className="text-sm">{s.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
