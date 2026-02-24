"use client";

import { Button } from "@/components/ui/button";

interface EditModeBarProps {
  editingName: string | null;
  editingDocstatus: number | null;
  onCancel: () => void;
}

export function EditModeBar({
  editingName,
  editingDocstatus,
  onCancel,
}: EditModeBarProps) {
  if (!editingName) return null;

  const label =
    editingDocstatus === 1
      ? `Amending: ${editingName}`
      : `Editing draft: ${editingName}`;

  return (
    <div className="flex items-center justify-between rounded-md bg-yellow-50 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
      <span className="font-medium">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={onCancel}
        className="text-yellow-800 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
      >
        Cancel Edit
      </Button>
    </div>
  );
}
